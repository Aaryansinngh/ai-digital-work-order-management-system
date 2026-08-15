export type Role = 'ADMINISTRATOR' | 'SUPERVISOR' | 'WORKER' | 'INVENTORY_MANAGER';
export type Criticality = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type WorkOrderPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type WorkOrderStatus = 'CREATED' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'APPROVED_CLOSED';
export type JobCardStatus = 'IN_PROGRESS' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
export type MaterialRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'ISSUED';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
}

export interface Equipment {
  id: string;
  name: string;
  location: string;
  criticality: Criticality;
  maintenanceHistory?: string;
  createdAt: string;
}

export interface WorkOrder {
  id: string;
  workOrderNumber: string;
  equipmentId: string;
  assignedToId: string;
  createdById: string;
  taskDescription: string;
  priority: WorkOrderPriority;
  priorityScore: number;
  priorityExplanation?: string;
  deadline: string;
  status: WorkOrderStatus;
  createdAt: string;
  completedAt?: string;
  equipment: Equipment;
  assignedTo: { id: string; name: string; email: string };
  createdBy: { id: string; name: string; email: string };
  jobCard?: JobCard;
}

export interface JobCard {
  id: string;
  workOrderId: string;
  completionPercentage: number;
  remarks?: string;
  status: JobCardStatus;
  rejectionReason?: string;
  evidencePhotos: string; // JSON string of photo array
  submittedAt?: string;
  approvedAt?: string;
  createdAt: string;
  workOrder?: WorkOrder;
  materialRequests?: MaterialRequest[];
}

export interface MaterialRequest {
  id: string;
  jobCardId: string;
  inventoryItemId: string;
  quantity: number;
  status: MaterialRequestStatus;
  requestedById: string;
  approvedById?: string;
  issuedById?: string;
  rejectionReason?: string;
  requestedAt: string;
  approvedAt?: string;
  issuedAt?: string;
  inventoryItem: InventoryItem;
  jobCard?: JobCard;
  requestedBy?: { id: string; name: string };
  approvedBy?: { id: string; name: string };
  issuedBy?: { id: string; name: string };
}

export interface InventoryItem {
  id: string;
  itemCode: string;
  name: string;
  unit: string;
  stockQuantity: number;
  reorderLevel: number;
  location?: string;
  isLowStock?: boolean;
  createdAt: string;
}

export interface InventoryIssue {
  id: string;
  inventoryItemId: string;
  quantity: number;
  materialRequestId: string;
  issuedById: string;
  createdAt: string;
  inventoryItem: InventoryItem;
  issuedBy: { id: string; name: string; email: string };
  materialRequest?: {
    jobCard?: {
      workOrder?: { workOrderNumber: string };
    };
  };
}

export interface AuditLog {
  id: string;
  userId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  previousValue?: string;
  newValue?: string;
  metadata?: string;
  createdAt: string;
  user?: { id: string; name: string; email: string; role: Role };
}

export interface PriorityScoreResult {
  score: number;
  priority: WorkOrderPriority;
  explanation: string;
  factorBreakdown: {
    deadlineProximityScore: number;
    equipmentCriticalityScore: number;
    slaRiskScore: number;
  };
}

export interface GeneratedReport {
  title: string;
  generatedAt: string;
  timeframe: string;
  generatedSummary: string;
  sourceData: any;
}
