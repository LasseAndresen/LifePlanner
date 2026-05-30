import { Injectable } from '@angular/core';
import { Card } from '../models/planner.models';

@Injectable({
  providedIn: 'root'
})
export class WhiteboardLayoutService {
  getCardX(card: Card, cards: Card[]): number {
    return card.whiteboardX !== null && card.whiteboardX !== undefined
      ? card.whiteboardX
      : this.getDefaultCoordinates(card, cards).x;
  }

  getCardY(card: Card, cards: Card[]): number {
    return card.whiteboardY !== null && card.whiteboardY !== undefined
      ? card.whiteboardY
      : this.getDefaultCoordinates(card, cards).y;
  }

  getDefaultCoordinates(card: Card, cards: Card[]): { x: number; y: number } {
    const index = cards.findIndex(c => c.id === card.id);
    const cardsPerRow = 3;
    const cardWidth = 320;
    const cardHeight = 250;
    const gap = 32;
    const startX = 48;
    const startY = 120;

    const row = Math.floor(index / cardsPerRow);
    const col = index % cardsPerRow;

    return {
      x: startX + col * (cardWidth + gap),
      y: startY + row * (cardHeight + gap)
    };
  }

  resolveOverlap(cardId: number, targetX: number, targetY: number, cards: Card[]): { x: number; y: number } {
    const getCardSize = (id: number) => {
      const el = document.querySelector(`.sidebar-card-item[data-card-id="${id}"]`);
      if (el) {
        return { w: el.clientWidth || 320, h: el.clientHeight || 250 };
      }
      const isSticky = cards.find(c => c.id === id)?.isStickyNote;
      return isSticky ? { w: 210, h: 210 } : { w: 320, h: 250 };
    };

    const targetSize = getCardSize(cardId);
    let resolvedX = Math.max(16, targetX);
    let resolvedY = Math.max(16, targetY);

    let hasOverlap = true;
    let iterations = 0;
    const maxIterations = 50;

    while (hasOverlap && iterations < maxIterations) {
      hasOverlap = false;
      iterations++;

      for (const other of cards) {
        if (other.id === cardId) continue;

        const otherX = this.getCardX(other, cards);
        const otherY = this.getCardY(other, cards);
        const otherSize = getCardSize(other.id);

        const overlapX = Math.max(0, Math.min(resolvedX + targetSize.w, otherX + otherSize.w) - Math.max(resolvedX, otherX));
        const overlapY = Math.max(0, Math.min(resolvedY + targetSize.h, otherY + otherSize.h) - Math.max(resolvedY, otherY));

        if (overlapX > 0 && overlapY > 0) {
          hasOverlap = true;
          if (overlapX < overlapY) {
            if (resolvedX < otherX) {
              resolvedX -= overlapX;
            } else {
              resolvedX += overlapX;
            }
          } else {
            if (resolvedY < otherY) {
              resolvedY -= overlapY;
            } else {
              resolvedY += overlapY;
            }
          }
          resolvedX = Math.max(16, resolvedX);
          resolvedY = Math.max(16, resolvedY);
          break;
        }
      }
    }

    return { x: Math.round(resolvedX), y: Math.round(resolvedY) };
  }
}
