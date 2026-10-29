import type { TransactionType } from "@keepitbalance/shared/finance";
import { SegmentedControl, type SegmentedOption } from "@/shared/components/form/SegmentedControl";
import { FieldLegend, FieldSet } from "@/shared/components/ui/field";

const typeOptions: SegmentedOption<TransactionType>[] = [
  { value: "expense", label: "Expense" },
  { value: "income", label: "Income" },
];

type TransactionTypeFieldProps = {
  value: TransactionType;
  onChange: (type: TransactionType) => void;
  disabled?: boolean;
};

export function TransactionTypeField({ value, onChange, disabled }: TransactionTypeFieldProps) {
  return (
    <FieldSet disabled={disabled}>
      <FieldLegend variant="label">Type</FieldLegend>
      <SegmentedControl value={value} options={typeOptions} onValueChange={onChange} disabled={disabled} />
    </FieldSet>
  );
}
