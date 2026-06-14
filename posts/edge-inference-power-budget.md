---
title: Fitting Neural Nets Inside a Coin-Cell Power Budget
date: 2025-03-11
tags: [edge-ai, embedded, power]
excerpt: How I used quantisation-aware training and MCUNet to push inference to 32 μW — and what I got wrong the first three times.
type: post
---

The pitch always sounds elegant: deploy a neural network on a microcontroller, run it on a battery, leave it in a field for a year. The reality is that getting there takes a long sequence of humbling failures. Here's what the third and fourth attempts taught me.

## Why 32 μW specifically

A standard CR2032 coin cell holds about 220 mAh at 3 V — roughly 2 376 J. If you want two years of operation without a site visit, your average power draw has to sit under **38 μW**. We targeted 32 μW to leave headroom for radio bursts and sensor warm-up transients.

The inference itself is only one slice of the budget. A naive accounting looks like this:

- Sensor acquisition (MLX90640 thermal, SDS011 particulate): ~1.8 mA for ~80 ms
- MCU active during inference: ~4 mA for ~120 ms
- LoRa transmit on alarm: ~120 mA for ~400 ms — amortised over a 4-second cycle
- Sleep current (STOP2 mode, RTC active): ~4 μA

With a 4-second duty cycle and an alarm rate of roughly 0.1% (conservative), the average works out to about **29 μW**. Fine — except the first prototype came in at 87 μW.

## What went wrong the first three times

### Attempt 1: forgetting about peripheral quiescent currents

The SDS011 particulate sensor draws 70 mA while its fan is running, even when you haven't asked it for a reading. It needs 30 seconds to stabilise. My first firmware woke it up on every cycle. Fixing this alone dropped average current by 40%.

### Attempt 2: SPI lines floating in sleep

The MLX90640 leaks current through its SPI lines when the bus is undriven and the sensor's VDD is still live. I was cutting MCU clock during STOP mode but leaving the sensor powered. Adding a load switch on the sensor rail (a small P-FET, ~$0.08) fixed it.

### Attempt 3: INT8 quantisation killing accuracy, not power

I post-training quantised a float32 model to INT8 expecting a free speedup. The model was undertrained for quantisation and accuracy dropped from 96% to 71% — unacceptable for a fire detector. The fix was **quantisation-aware training (QAT)**: simulating quantisation noise during the training forward pass so the weights learn to tolerate it.

QAT with MCUNet recovers nearly all the accuracy lost by PTQ. The training time penalty is about 2× but it's a one-time cost.

## The actual training loop

```python
import torch
from torch.quantization import prepare_qat, convert

model.fuse_model()
model.qconfig = torch.quantization.get_default_qat_qconfig('qnnpack')
prepare_qat(model, inplace=True)

for epoch in range(num_epochs):
    train_one_epoch(model, loader, optimizer)
    if epoch == num_epochs - 3:
        model.apply(torch.quantization.disable_observer)
        model.apply(torch.nn.intrinsic.qat.freeze_bn_stats)

model.eval()
quantised_model = convert(model.cpu(), inplace=False)
torch.save(quantised_model.state_dict(), "weights_int8.pt")
```

## Measuring real power on-device

Simulation is not enough. I use a Nordic PPK2 (Power Profiler Kit II) in ampere-meter mode with a custom 3 V supply rail. The key is measuring at the rail, not at a test point — any series resistance between the meter and the board introduces voltage drop that the LDO can't compensate for at low currents.

```c
#define PROFILE_START()  HAL_GPIO_WritePin(GPIOA, GPIO_PIN_0, GPIO_PIN_SET)
#define PROFILE_END()    HAL_GPIO_WritePin(GPIOA, GPIO_PIN_0, GPIO_PIN_RESET)

PROFILE_START();
bool fire = run_inference(frame_q8);
PROFILE_END();
```

## Final numbers

After all three fixes and QAT, the deployed firmware lands at **29 μW average** at a 4-second duty cycle, with 96.1% accuracy on the hold-out test set. Battery life on a CR2032 in field conditions: ~18 months (thermal cycling shortens the cell life more than discharge does).

The lesson: power optimisation is mostly *peripheral management*, not model compression. The model changes matter, but they're the last 20% of the gain.

---

Hardware design files and training code for the wildfire sensor are on [GitHub](https://github.com/unnobatroo). Questions welcome at [unnobatroo@icloud.com](mailto:unnobatroo@icloud.com).
