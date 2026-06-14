---
title: Building a Minimal RISC-V Softcore for Inference
date: 2024-07-28
tags: [embedded, fpga, risc-v]
excerpt: Synthesising a hand-rolled RV32IM on a $4 iCE40 and getting a CNN to run on it. Spoiler: the toolchain is the hard part.
---

The Lattice iCE40UP5K is a $4 FPGA with 5280 LUTs, 1 Mb SPRAM, and a hard SPI block. It is not supposed to run a CPU *and* do useful inference. I did it anyway, mostly to understand where the real bottlenecks are in ultra-low-power neural network execution — and partly because fitting a 32-bit RISC-V core plus an INT8 matrix engine into 4 200 LUTs felt like a good puzzle.

## Why a softcore instead of an ARM MCU?

The short answer is reconfigurability. A fixed MCU gives you a fixed pipeline; an FPGA lets you co-design the CPU and the accelerator so the datapath is exactly as wide as your model weights require — no more, no less. For an 8-bit 32×32 matrix multiply the optimal SIMD width is 32 bytes, which maps cleanly onto a 256-bit bus inside the fabric but would require awkward tiling on any standard MCU with a 32-bit or 64-bit SIMD unit.

The longer answer is that I wanted to understand what "minimal" actually means. A Cortex-M0 is minimal for a product; a hand-rolled RV32IMC in Verilog is minimal for learning. The former abstracts everything; the latter forces you to own every cycle.

## The core: rv32e-lite

I started from [PicoRV32](https://github.com/YosysHQ/picorv32) and stripped it down to RV32E (16 registers instead of 32) with no multiply/divide hardware. That freed about 600 LUTs. The resulting core synthesises to 1 050 LUTs on iCE40 at 24 MHz via nextpnr. Call it *rv32e-lite*.

```verilog
// nextpnr --hx8k --package cb132 --freq 24
// Resource utilisation after place-and-route:
//
//   Module          LUTs    FFs    BRAM (kB)
//   rv32e_lite      1050    612      0
//   spi_controller   128     96      0
//   uart_tx           48     32      0
//   matmul_int8     2720   1408     64
//   weight_cache       0      0    128
//   ------------------------------------------
//   TOTAL           3946   2148    192 / 256 kB
//   Headroom          6%    59%     25%
```

## The accelerator: matmul_int8

The matrix multiply unit is a systolic array of 8 MAC cells, each operating on INT8 operands with INT32 accumulation. Eight cells was the sweet spot: wider arrays fit but the routing congestion pushed timing below 20 MHz. At 8 cells and 24 MHz the throughput is 192 MMAC/s — enough for a 4-layer MLP with 128-unit hidden layers to run in under 2 ms.

The CPU loads weight tiles from the on-chip SPRAM via a custom CSR instruction (`matmul.load`, opcode space 0x0B), fires the accelerator with `matmul.exec`, then polls a status CSR. Total software overhead per layer: ~30 instructions.

```c
void fc_layer(const int8_t *weight_ptr, const int8_t *in_ptr,
              int32_t *out_ptr, int rows, int cols) {
    asm volatile("csrw 0x800, %0" :: "r"(weight_ptr));
    asm volatile("csrw 0x801, %0" :: "r"(in_ptr));
    asm volatile("csrw 0x802, %0" :: "r"(out_ptr));
    asm volatile("csrw 0x803, %0" :: "r"((rows << 16) | cols));
    asm volatile("csrw 0x804, %0" :: "r"(1));
    int status;
    do { asm volatile("csrr %0, 0x805" : "=r"(status)); } while (!(status & 1));
}
```

## Power and timing results

Measured on a custom breakout board with a Nordic Power Profiler Kit II:

- Idle (clocks gated): **85 μW** at 1.2 V core
- Inference active (4-layer MLP, 128 units): **4.2 mW**
- Inference latency: **1.8 ms**
- Energy per inference: **7.6 μJ**

For comparison, the same model on an STM32L476 Cortex-M4 @ 80 MHz with CMSIS-NN takes 3.1 ms and consumes ~18 mW active — about 56 μJ per inference. The softcore approach is 7× more energy-efficient despite running at 3× lower clock speed, because the datapath width is matched to the workload.

The key insight: energy efficiency in inference is dominated by memory bandwidth, not compute. The iCE40 SPRAM at 256 kB is small but it sits directly on the fabric crossbar — no cache hierarchy, no DDR latency. For models that fit, you get near-zero memory access overhead.

## What I would do differently

The custom CSR interface for the accelerator is brittle — any ABI change breaks the software toolchain. A better design would map the accelerator registers into a memory-mapped I/O window and use normal load/store instructions. The compiler can optimise those; inline assembly is opaque to the register allocator.

I also hit the SPRAM ceiling at 256 kB, which limits models to about 60 000 INT8 parameters. The next step is an external SPI PSRAM (e.g., Espressif ESP-PSRAM64H, 8 MB) with a prefetch buffer in fabric — trades latency for capacity. That project is in progress.

RTL source and synthesis scripts on [GitHub](https://github.com/unnobatroo).
