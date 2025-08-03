import subprocess
import sys
from pathlib import Path

import pygame

REPO_ROOT = Path(__file__).resolve().parents[1]

FEATURES = [
    (
        "Edge Monitoring",
        [sys.executable, str(REPO_ROOT / "rpi" / "start_edge_service.py")],
    ),
    (
        "Edge Monitoring (Anomaly Detection)",
        [sys.executable, str(REPO_ROOT / "rpi" / "start_edge_service_anomaly.py")],
    ),
    (
        "Mininet Traffic",
        ["sudo", "python3", str(REPO_ROOT / "mininet" / "gen_traffic.py")],
    ),
    (
        "ML Inference",
        [sys.executable, str(REPO_ROOT / "training" / "run_inference.py")],
    ),
    (
        "SDN Controller",
        [
            "ryu-manager",
            str(REPO_ROOT / "sdn-controller" / "simple_monitor.py"),
        ],
    ),
    (
        "SPI Dashboard",
        [sys.executable, str(REPO_ROOT / "rpi" / "spi_display.py")],
    ),
]

WIDTH, HEIGHT = 480, 320
BUTTON_H = 50


def draw_menu(screen, font):
    screen.fill((0, 0, 0))
    buttons = []
    for idx, (label, _cmd) in enumerate(FEATURES):
        rect = pygame.Rect(40, 40 + idx * (BUTTON_H + 10), 400, BUTTON_H)
        pygame.draw.rect(screen, (0, 128, 255), rect)
        text = font.render(f"{idx + 1}. {label}", True, (255, 255, 255))
        screen.blit(text, (rect.x + 10, rect.y + 10))
        buttons.append(rect)
    # Exit button
    rect = pygame.Rect(40, 40 + len(FEATURES) * (BUTTON_H + 10), 400, BUTTON_H)
    pygame.draw.rect(screen, (128, 0, 0), rect)
    text = font.render("Exit", True, (255, 255, 255))
    screen.blit(text, (rect.x + 10, rect.y + 10))
    buttons.append(rect)
    pygame.display.flip()
    return buttons


def run_command(screen, font, cmd):
    proc = subprocess.Popen(cmd, cwd=REPO_ROOT)
    while True:
        screen.fill((0, 0, 0))
        lines = [
            f"Running: {' '.join(cmd)}",
            "Press ESC to stop",
        ]
        y = 100
        for line in lines:
            text = font.render(line, True, (255, 255, 255))
            screen.blit(text, (20, y))
            y += font.get_height() + 10
        pygame.display.flip()
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                proc.terminate()
                proc.wait()
                pygame.quit()
                sys.exit(0)
            if event.type == pygame.KEYDOWN and event.key == pygame.K_ESCAPE:
                proc.terminate()
                proc.wait()
                return
        if proc.poll() is not None:
            return
        pygame.time.wait(100)


def main():
    pygame.init()
    screen = pygame.display.set_mode((WIDTH, HEIGHT))
    font = pygame.font.Font(None, 36)

    while True:
        buttons = draw_menu(screen, font)
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                pygame.quit()
                return
            if event.type == pygame.MOUSEBUTTONDOWN:
                pos = event.pos
                for idx, rect in enumerate(buttons):
                    if rect.collidepoint(pos):
                        if idx == len(FEATURES):
                            pygame.quit()
                            return
                        run_command(screen, font, FEATURES[idx][1])
            if event.type == pygame.KEYDOWN:
                if event.key == pygame.K_ESCAPE:
                    pygame.quit()
                    return
                if pygame.K_1 <= event.key <= pygame.K_0 + len(FEATURES):
                    idx = event.key - pygame.K_1
                    run_command(screen, font, FEATURES[idx][1])
        pygame.time.wait(100)


if __name__ == "__main__":
    main()
