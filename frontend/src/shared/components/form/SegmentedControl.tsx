import { ToggleGroup, ToggleGroupItem } from "@/shared/components/ui/toggle-group";

export type SegmentedOption<T extends string> = { value: T; label: string };

type SegmentedControlProps<T extends string> = {
  value: T;
  options: SegmentedOption<T>[];
  onValueChange: (value: T) => void;
  disabled?: boolean;
};

export function SegmentedControl<T extends string>({
  value,
  options,
  onValueChange,
  disabled,
}: SegmentedControlProps<T>) {
  function selectOption(selectedValue: string) {
    const selectedOption = options.find((option) => option.value === selectedValue);
    if (selectedOption) onValueChange(selectedOption.value);
  }

  return (
    <ToggleGroup
      type="single"
      value={value}
      disabled={disabled}
      onValueChange={selectOption}
      className="grid w-full auto-cols-fr grid-flow-col gap-1 rounded-lg bg-muted p-1 ring-1 ring-border/60 ring-inset"
    >
      {options.map((option) => (
        <ToggleGroupItem
          key={option.value}
          value={option.value}
          className="h-8 rounded-md text-muted-foreground hover:bg-transparent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring data-[state=on]:bg-card data-[state=on]:text-foreground data-[state=on]:shadow-xs dark:data-[state=on]:bg-input/40"
        >
          {option.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
