import { TestBed } from '@angular/core/testing';
import { WhiteboardLayoutService } from './whiteboard-layout.service';
import { Card } from '../models/planner.models';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

describe('WhiteboardLayoutService', () => {
  let service: WhiteboardLayoutService;

  const mockCards: Card[] = [
    { id: 1, title: 'Card 1', isChecklist: false, listItems: [], categoryId: 1, userId: 100 },
    { id: 2, title: 'Card 2', isChecklist: false, listItems: [], categoryId: 1, userId: 100, whiteboardX: 100, whiteboardY: 150 },
    { id: 3, title: 'Card 3', isChecklist: false, listItems: [], categoryId: 1, userId: 100, isStickyNote: true },
    { id: 4, title: 'Card 4', isChecklist: false, listItems: [], categoryId: 1, userId: 100 }
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [WhiteboardLayoutService]
    });
    service = TestBed.inject(WhiteboardLayoutService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getCardX and getCardY', () => {
    it('should return whiteboardX/Y if they are defined and not null', () => {
      const card = mockCards[1]; // has whiteboardX: 100, whiteboardY: 150
      expect(service.getCardX(card, mockCards)).toBe(100);
      expect(service.getCardY(card, mockCards)).toBe(150);
    });

    it('should fallback to default coordinates if whiteboardX/Y are null or undefined', () => {
      const card = mockCards[0]; // has undefined whiteboardX/Y, index 0
      // index 0: row=0, col=0 => x = 48 + 0 * 352 = 48, y = 120 + 0 * 282 = 120
      expect(service.getCardX(card, mockCards)).toBe(48);
      expect(service.getCardY(card, mockCards)).toBe(120);
    });
  });

  describe('getDefaultCoordinates', () => {
    it('should calculate grid position correctly based on index in array', () => {
      // index 0
      const coord0 = service.getDefaultCoordinates(mockCards[0], mockCards);
      expect(coord0).toEqual({ x: 48, y: 120 });

      // index 1
      const coord1 = service.getDefaultCoordinates(mockCards[1], mockCards);
      expect(coord1).toEqual({ x: 48 + 1 * 352, y: 120 });

      // index 3: row=1, col=0 => x = 48, y = 120 + 282 = 402
      const coord3 = service.getDefaultCoordinates(mockCards[3], mockCards);
      expect(coord3).toEqual({ x: 48, y: 402 });
    });
  });

  describe('resolveOverlap', () => {
    beforeEach(() => {
      // Mock document.querySelector to return null so it uses fallback checks
      vi.spyOn(document, 'querySelector').mockReturnValue(null);
    });

    it('should return minimum allowed coordinates (16, 16) if target coordinates are below 16', () => {
      const result = service.resolveOverlap(1, 5, 10, mockCards);
      expect(result.x).toBeGreaterThanOrEqual(16);
      expect(result.y).toBeGreaterThanOrEqual(16);
    });

    it('should use fallback sticky card sizes (210x210) for sticky note cards when DOM is not available', () => {
      // Move card 3 (sticky) and check resolveOverlap handles it
      // Let's verify overlap logic is invoked
      const cards = [
        { id: 1, title: 'Card 1', isChecklist: false, listItems: [], categoryId: 1, userId: 100, whiteboardX: 100, whiteboardY: 100 },
        { id: 3, title: 'Card 3', isChecklist: false, listItems: [], categoryId: 1, userId: 100, isStickyNote: true }
      ];
      // Target coordinates overlapping with Card 1 (100, 100, size 320x250)
      // card 3 size is 210x210
      // targetX: 120, targetY: 120 (clearly inside Card 1)
      const resolved = service.resolveOverlap(3, 120, 120, cards);
      expect(resolved).toEqual({ x: 120, y: 350 });
    });

    it('should resolve overlaps using DOM clientWidth/clientHeight when element exists', () => {
      const mockElement = {
        clientWidth: 150,
        clientHeight: 150
      };
      vi.spyOn(document, 'querySelector').mockReturnValue(mockElement as any);

      const cards = [
        { id: 1, title: 'Card 1', isChecklist: false, listItems: [], categoryId: 1, userId: 100, whiteboardX: 100, whiteboardY: 100 },
        { id: 2, title: 'Card 2', isChecklist: false, listItems: [], categoryId: 1, userId: 100 }
      ];

      // Placing card 2 at 120, 120 (which overlaps with card 1)
      // Using mockElement size (150x150)
      const resolved = service.resolveOverlap(2, 120, 120, cards);
      expect(resolved).toEqual({ x: 120, y: 250 });
    });

    it('should return target coordinates if no overlap exists', () => {
      const cards = [
        { id: 1, title: 'Card 1', isChecklist: false, listItems: [], categoryId: 1, userId: 100, whiteboardX: 100, whiteboardY: 100 },
        { id: 2, title: 'Card 2', isChecklist: false, listItems: [], categoryId: 1, userId: 100 }
      ];
      // Place far away
      const resolved = service.resolveOverlap(2, 800, 800, cards);
      expect(resolved).toEqual({ x: 800, y: 800 });
    });
  });
});
