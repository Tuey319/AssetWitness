import { Request, Response, NextFunction } from 'express';
import { createHandoverCaseSchema } from '../schemas/dashboardSchemas';
import * as handoverCaseRepo from '../models/handoverCaseRepo';

export async function createCase(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = createHandoverCaseSchema.parse(req.body);
    const record = await handoverCaseRepo.create(body);
    res.status(201).json(record);
  } catch (err) {
    next(err);
  }
}

export async function getSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const cases = await handoverCaseRepo.findAll();

    const byBuilding = new Map<string, {
      building: string;
      case_count: number;
      dispute_count: number;
      total_estimated_cost_thb: number;
      total_dad_responsibility_thb: number;
      total_occupant_responsibility_thb: number;
    }>();

    for (const c of cases) {
      const row = byBuilding.get(c.building) ?? {
        building: c.building,
        case_count: 0,
        dispute_count: 0,
        total_estimated_cost_thb: 0,
        total_dad_responsibility_thb: 0,
        total_occupant_responsibility_thb: 0,
      };
      row.case_count += 1;
      if (c.needs_dispute_resolution) row.dispute_count += 1;
      row.total_estimated_cost_thb += c.total_estimated_cost_thb;
      row.total_dad_responsibility_thb += c.total_dad_responsibility_thb;
      row.total_occupant_responsibility_thb += c.total_occupant_responsibility_thb;
      byBuilding.set(c.building, row);
    }

    const buildings = Array.from(byBuilding.values())
      .map((b) => ({ ...b, dispute_rate: b.case_count > 0 ? b.dispute_count / b.case_count : 0 }))
      .sort((a, b) => b.dispute_rate - a.dispute_rate);

    res.json({
      buildings,
      totals: {
        case_count: cases.length,
        dispute_count: cases.filter((c) => c.needs_dispute_resolution).length,
        total_estimated_cost_thb: cases.reduce((s, c) => s + c.total_estimated_cost_thb, 0),
        total_dad_responsibility_thb: cases.reduce((s, c) => s + c.total_dad_responsibility_thb, 0),
        total_occupant_responsibility_thb: cases.reduce((s, c) => s + c.total_occupant_responsibility_thb, 0),
      },
    });
  } catch (err) {
    next(err);
  }
}
