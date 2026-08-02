'use client';

import { ConditionItem } from '@/types';

interface Props {
  items: ConditionItem[];
  onChange: (items: ConditionItem[]) => void;
}

export default function ClaimsList({ items, onChange }: Props) {
  const add = () => {
    const n = items.length + 1;
    onChange([...items, {
      item_id: `I${String(n).padStart(3, '0')}`,
      item: '', description: '', estimated_cost_thb: 0,
    }]);
  };

  const remove = (i: number) =>
    onChange(
      items
        .filter((_, idx) => idx !== i)
        .map((c, idx) => ({ ...c, item_id: `I${String(idx + 1).padStart(3, '0')}` }))
    );

  const update = (i: number, field: keyof ConditionItem, value: string | number) =>
    onChange(items.map((c, idx) => idx === i ? { ...c, [field]: value } : c));

  return (
    <section className="card">
      <h2>รายการทรัพย์สินที่ต้องตรวจสอบ <span className="h2-en">Condition items</span></h2>
      <div>
        {items.map((c, i) => (
          <div key={i} className="claim-row">
            <div className="claim-num">{i + 1}</div>
            <div className="claim-fields">
              <div className="field">
                <label>รายการ <span className="lbl-en">Item</span></label>
                <input
                  type="text"
                  placeholder="e.g. conference room wall"
                  value={c.item}
                  onChange={e => update(i, 'item', e.target.value)}
                />
              </div>
              <div className="field claim-desc-field">
                <label>รายละเอียด <span className="lbl-en">Description</span></label>
                <input
                  type="text"
                  placeholder="Describe the condition change"
                  value={c.description}
                  onChange={e => update(i, 'description', e.target.value)}
                />
              </div>
              <div className="field claim-amount-field">
                <label>มูลค่าประเมิน (บาท) <span className="lbl-en">Estimated cost</span></label>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={c.estimated_cost_thb || ''}
                  onChange={e => update(i, 'estimated_cost_thb', parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>
            <button type="button" className="btn-remove" onClick={() => remove(i)}>✕</button>
          </div>
        ))}
      </div>
      <button type="button" className="btn-secondary" onClick={add}>+ เพิ่มรายการ · Add item</button>
    </section>
  );
}
