import { Textarea } from "~/components/dashboard/Textarea";

type ContractNotesFieldProps = {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
};

export default function ContractNotesField({ value, defaultValue, onChange }: ContractNotesFieldProps) {
  return (
    <Textarea
      label="Contract Notes"
      name="notes"
      rows={4}
      value={value}
      defaultValue={defaultValue}
      onChange={onChange}
      placeholder="Add any extra information (flight info, car condition, etc.)"
    />
  );
}
