import { Criticality, WorkOrderPriority } from '@prisma/client';

export interface PriorityScoreInput {
  deadline: Date | string;
  criticality: Criticality;
  taskDescription: string;
}

export interface PriorityScoreResult {
  score: number; // 0 - 100
  priority: WorkOrderPriority;
  explanation: string;
  factorBreakdown: {
    deadlineProximityScore: number;
    equipmentCriticalityScore: number;
    slaRiskScore: number;
  };
}

export function calculatePriorityScore(input: PriorityScoreInput): PriorityScoreResult {
  const now = new Date();
  const deadlineDate = new Date(input.deadline);
  const diffHours = (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60);

  // 1. Deadline Proximity Score (Weight 40%)
  // Closer deadline = higher score. < 6 hours = 100, 24 hrs = 75, 72 hrs = 40, > 7 days = 10.
  let deadlineProximityScore = 20;
  if (diffHours <= 0) {
    deadlineProximityScore = 100; // Already past or due immediately
  } else if (diffHours <= 6) {
    deadlineProximityScore = 95;
  } else if (diffHours <= 24) {
    deadlineProximityScore = 80;
  } else if (diffHours <= 72) {
    deadlineProximityScore = 55;
  } else if (diffHours <= 168) {
    deadlineProximityScore = 35;
  }

  // 2. Equipment Criticality Score (Weight 35%)
  let equipmentCriticalityScore = 30;
  switch (input.criticality) {
    case 'CRITICAL':
      equipmentCriticalityScore = 100;
      break;
    case 'HIGH':
      equipmentCriticalityScore = 75;
      break;
    case 'MEDIUM':
      equipmentCriticalityScore = 50;
      break;
    case 'LOW':
      equipmentCriticalityScore = 25;
      break;
  }

  // 3. SLA Breach & Urgency Keyword Risk Score (Weight 25%)
  let slaRiskScore = 20;
  const lowerDesc = input.taskDescription.toLowerCase();
  const urgentKeywords = ['leak', 'burst', 'failure', 'smoke', 'emergency', 'vibration', 'overheat', 'critical', 'breakdown', 'shutdown', 'power loss', 'hazard'];
  const highKeywords = ['noise', 'worn', 'replace', 'clogged', 'drop', 'pressure', 'calibration', 'repair'];

  const matchedUrgent = urgentKeywords.filter(k => {
    if (k === 'critical' && lowerDesc.includes('non-critical')) return false;
    return lowerDesc.includes(k);
  });
  const matchedHigh = highKeywords.filter(k => lowerDesc.includes(k));

  if (matchedUrgent.length > 0) {
    slaRiskScore = 95;
  } else if (matchedHigh.length > 0) {
    slaRiskScore = 65;
  }

  // Calculate Weighted Total Score
  const rawScore = (deadlineProximityScore * 0.40) + (equipmentCriticalityScore * 0.35) + (slaRiskScore * 0.25);
  const finalScore = Math.round(Math.min(100, Math.max(0, rawScore)));

  // Determine Classification
  let priority: WorkOrderPriority = 'MEDIUM';
  if (finalScore >= 80) {
    priority = 'URGENT';
  } else if (finalScore >= 65) {
    priority = 'HIGH';
  } else if (finalScore >= 40) {
    priority = 'MEDIUM';
  } else {
    priority = 'LOW';
  }

  // Generate Explanation
  const reasons: string[] = [];
  if (diffHours <= 24) {
    reasons.push(`Deadline is tight (${diffHours > 0 ? `${Math.round(diffHours)} hours remaining` : 'Immediate/Overdue'}).`);
  } else {
    reasons.push(`Deadline set for ${deadlineDate.toISOString().slice(0, 10)}.`);
  }

  reasons.push(`Equipment criticality is rated as ${input.criticality}.`);

  if (matchedUrgent.length > 0) {
    reasons.push(`High SLA risk detected due to critical keywords in description: "${matchedUrgent.join(', ')}".`);
  } else if (matchedHigh.length > 0) {
    reasons.push(`Moderate risk detected due to task scope keywords: "${matchedHigh.join(', ')}".`);
  } else {
    reasons.push(`Standard SLA risk profile.`);
  }

  const explanation = `Calculated Priority Score: ${finalScore}/100 [${priority}]\nKey Factors:\n- ${reasons.join('\n- ')}`;

  return {
    score: finalScore,
    priority,
    explanation,
    factorBreakdown: {
      deadlineProximityScore,
      equipmentCriticalityScore,
      slaRiskScore,
    },
  };
}
