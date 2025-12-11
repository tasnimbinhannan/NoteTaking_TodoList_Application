OS Project - README
===================

Project location: E:/OS Project
Filename: README.txt

1) Project Overview
-------------------
This repository contains the source and build infrastructure for a small educational operating
system (kernel + simple user utilities) implemented as part of an OS course / personal project.
The OS targets the x86 architecture and provides a minimal bootloader, kernel core, device
abstraction, a basic scheduler, and a small set of filesystem and user-mode utilities for
demonstration and testing.

High-level goals:
- Learn low-level systems programming (boot, memory, interrupts).
- Provide a compact, readable kernel suitable for incremental extension.
- Support running in QEMU/Bochs and on real hardware (incomplete hardware support).
- Offer an automated build and test workflow.

2) Features
-----------
- Multistage boot (MBR/GRUB or custom boot sector)
- Basic kernel initialization (GDT, IDT, PIC/APIC setup)
- Physical and virtual memory management (simple page allocator)
- IRQ handling and simple device drivers (keyboard, PIT, serial)
- Cooperative/preemptive scheduler (configurable)
- Simple in-memory filesystem and process loader
- Minimal user-space programs (shell, hello, tests)
- Debugging support via serial and GDB stubs

3) Prerequisites
----------------
Host OS: Linux or Windows with a POSIX-like shell (WSL recommended on Windows).
Required tools (examples):
- Cross toolchain (recommended): x86_64-elf-gcc, x86_64-elf-ld, x86_64-elf-as, objcopy
    or i686-elf-* if building 32-bit variant.
- GNU Make
- NASM (for assembly/boot stages)
- QEMU (qemu-system-x86_64 or qemu-system-i386)
- GNU binutils, GDB (for kernel debugging)
- xorriso / genisoimage (if building ISO)
- Python 3 (optional for build helpers)

Install example on Ubuntu:
    sudo apt install build-essential nasm qemu-system-x86 binutils-multiarch gcc-multilib \
                                     python3 git xorriso

4) Build and Run
-----------------
Basic build (uses cross-compiler prefix defined in Makefile or environment):
    make all

Clean:
    make clean

Build and run in QEMU (64-bit example):
    make qemu
or run manually:
    qemu-system-x86_64 -m 512 -serial stdio -kernel build/kernel.bin

To run with a GDB stub and wait for debugger:
    qemu-system-x86_64 -m 512 -serial stdio -kernel build/kernel.bin -s -S
Then connect with:
    x86_64-elf-gdb build/kernel.elf -ex "target remote :1234"

If building a bootable ISO (GRUB-based):
    make iso
    qemu-system-x86_64 -cdrom build/os.iso -m 512 -serial stdio

Notes:
- Set CROSS_COMPILE environment variable to choose toolchain prefix:
    export CROSS_COMPILE=x86_64-elf-
- The Makefile uses standard targets: all, clean, qemu, iso, run, test.

5) Directory Layout
-------------------
/boot        - Bootloader code, stage0/stage1 or GRUB configuration
/src         - Kernel source code (C and assembly)
/include     - Shared headers and ABI definitions
/drivers     - Device driver implementations
/user        - Simple user-space programs / utilities
/tests       - Automated test programs and harness
/build       - Output directory for object files and final images
/tools       - Helper scripts (mkimg, debug helpers)
/docs        - Design notes, specification, class reports
/Makefile    - Top-level build file
/README.txt  - This file

6) Configuration
----------------
Configuration options live in include/config.h or config.mk:
- ARCH = x86_64 or i386
- KERNEL_HEAP_SIZE, MAX_TASKS, SCHEDULER_TYPE (ROUND_ROBIN, PRIORITY)
- ENABLE_PREEMPTION = 0/1
- USE_GRUB = 0/1

Set via environment or edit config files before building:
    make ARCH=x86_64 ENABLE_PREEMPTION=1

7) Testing and Debugging
------------------------
- Unit tests: small user-mode tests in /tests; run with make test
- Integration tests: boot and run scripts that validate syscalls and scheduling
- Serial logging: kernel prints to serial port; QEMU -serial stdio shows logs
- GDB debugging: build kernel with debug symbols (CONFIG_DEBUG=1), run QEMU with -s -S,
    connect with cross GDB and set breakpoints.
- Logging levels controlled via LOG_LEVEL in config.

8) Contributing
---------------
- Fork, create a feature branch, add tests, submit a pull request.
- Maintain code readability: prefer small, well-commented commits.
- Add design notes to /docs when introducing new subsystems.
- Run the test suite before submitting: make test

Code style:
- Kernel is mostly C with GCC extensions; follow K&R-style indentation.
- Prefer explicit, well-commented assembly for boot and context switching.

9) Known Issues & Roadmap
-------------------------
Known issues:
- Incomplete driver coverage for real hardware (disk, network).
- Filesystem is minimal and not crash-resilient.
- SMP/ACPI support experimental.

Planned:
- Add preemptive SMP scheduler and better user-space API.
- Implement persistent filesystem with block device driver.
- Add networking stack (TCP/IP).

10) License
-----------
This project is released under the MIT License. See LICENSE file for details.

11) Reporting Bugs / Contact
---------------------------
Please open issues in the repository issue tracker. Include:
- Host OS and toolchain versions
- Exact build commands and output
- QEMU command-line (if used)
- Kernel log / serial output

12) References
--------------
See /docs for architecture diagrams, syscall ABI, and development notes.

----------------------------------------------------
End of README
----------------------------------------------------