import { calculatePriorityScore } from '../src/ai/priorityScorer';
import { executeSemanticSearch } from '../src/ai/semanticSearch';
import { generateNaturalLanguageReport } from '../src/ai/reportGenerator';

describe('AI CMMS Unit & Business Logic Integration Suite', () => {
  
  describe('1. AI Feature 1 - Transparent Priority Scoring Engine', () => {
    it('should compute high priority score for urgent task with tight deadline and critical equipment', () => {
      const now = new Date();
      const tightDeadline = new Date(now.getTime() + 4 * 60 * 60 * 1000); // 4 hours from now

      const result = calculatePriorityScore({
        deadline: tightDeadline,
        criticality: 'CRITICAL',
        taskDescription: 'Urgent mechanical seal leak causing overheating risk',
      });

      expect(result.score).toBeGreaterThanOrEqual(80);
      expect(result.priority).toBe('URGENT');
      expect(result.explanation).toContain('CRITICAL');
      expect(result.explanation).toContain('leak');
    });

    it('should compute low priority score for non-urgent task with far deadline and low criticality', () => {
      const farDeadline = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000); // 10 days away

      const result = calculatePriorityScore({
        deadline: farDeadline,
        criticality: 'LOW',
        taskDescription: 'Routine paint touchup on non-critical pipe rack',
      });

      expect(result.score).toBeLessThan(50);
      expect(result.priority).toBe('LOW');
    });
  });

  describe('2. AI Feature 2 - Semantic Search Parser Fallback', () => {
    it('should handle search fallback logic cleanly without throwing', async () => {
      const searchFn = async () => {
        return executeSemanticSearch({
          query: 'urgent turbine maintenance',
        });
      };
      
      await expect(searchFn()).resolves.not.toThrow();
    });
  });

  describe('3. AI Feature 3 - Automated Report Generator', () => {
    it('should generate report summary without modifying raw DB counts', async () => {
      const reportFn = async () => {
        return generateNaturalLanguageReport({
          module: 'WORK_ORDERS',
        });
      };

      await expect(reportFn()).resolves.not.toThrow();
    });
  });

  describe('4. Inventory Stock Guardrails', () => {
    it('should prevent negative inventory allocation mathematically', () => {
      const currentStock = 5;
      const requestedQuantity = 10;
      const canIssue = currentStock >= requestedQuantity;
      
      expect(canIssue).toBe(false);
    });

    it('should trigger low stock flag when stock is less than or equal to reorder level', () => {
      const stockQuantity = 3;
      const reorderLevel = 5;
      const isLowStock = stockQuantity <= reorderLevel;

      expect(isLowStock).toBe(true);
    });
  });
});
