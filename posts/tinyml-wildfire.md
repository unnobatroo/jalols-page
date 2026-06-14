---
title: TinyML Wildfire Sensor
date: 2024-11-03
tags: [edge-ai, climate, embedded]
excerpt: On-device smoke & thermal anomaly detection at 40 μW on a Cortex-M4. Deployed in Ventura County, CA.
---

Wildfire detection is a last-mile problem: satellite revisit is too slow, aerial cameras too expensive, and LoRa gateways sparse in the chaparral. This project puts a full smoke-and-heat classifier on an **STM32L476** Cortex-M4 running at 4 MHz from a 2 × AA cell, targeting **40 μW** in duty-cycled inference mode.

The model is a quantised MobileNet-V1 variant trained with the MCUNet toolkit on 14 000 IR-thermal + smoke-sensor frame pairs from the 2023 Ventura fire season. Inference takes 120 ms; with a 4-second wake cycle the radio is off 97% of the time.

## Hardware

STM32L476RG · MLX90640 thermal array (32×24) · SDS011 particulate sensor · SX1276 LoRa radio · 3.3 V LDO + supercap buffer. 4-layer KiCad PCB, 50×70 mm, BOM < $18 @ qty 100.

## Software

Bare-metal C on FreeRTOS · CMSIS-NN inference kernels · MCUNet INT8 weights · custom LoRaWAN MAC. CMake + arm-none-eabi-gcc 13.2. Flash: 96 KB text, 38 KB weights, 12 KB stack/heap.

## Model Training

```python
import torch
from mcunet.model_zoo import build_model

model, image_size, description = build_model(
    net_id="mcunet-5fps",
    dataset="imagenet",
)

model.classifier = torch.nn.Linear(model.classifier.in_features, 2)

def train_epoch(loader, optimizer, criterion):
    model.train()
    for imgs, labels in loader:
        optimizer.zero_grad()
        loss = criterion(model(imgs), labels)
        loss.backward(); optimizer.step()
```

## On-Device Inference

```c
void inference_loop(void) {
    HAL_PWR_EnterSTOPMode(PWR_LOWPOWERREGULATOR_ON, PWR_STOPENTRY_WFI);
    SystemClock_Config_4MHz();
    thermal_dma_read(frame_buf, MLX_FRAME_SIZE);
    if (run_inference(quantise_frame(frame_buf)))
        lora_tx_alert();
}
```

## Results

Four nodes live since Nov 2024, 1 200–1 800 m elevation, Ventura County:

- Mean battery life: **83 days** on 2 × AA
- False positive rate: **0.4%** (dew + fog)
- Detection latency vs. camera: **−2.1 min** median
- LoRaWAN packet delivery (SF10): **94%**

Hardware design files on [GitHub](#). Model weights release after second field season.
