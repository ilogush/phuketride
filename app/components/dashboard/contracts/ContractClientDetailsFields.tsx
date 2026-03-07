import { Input } from "~/components/dashboard/Input";

type ClientDefaults = {
  passportNumber?: string | null;
  name?: string | null;
  surname?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  telegram?: string | null;
  email?: string | null;
};

type ContractClientDetailsFieldsProps = {
  defaults?: ClientDefaults;
  onLatinNameInput?: (e: React.ChangeEvent<HTMLInputElement>, label: string) => void;
};

export default function ContractClientDetailsFields({ defaults, onLatinNameInput }: ContractClientDetailsFieldsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Input
        label="Passport Number"
        name="client_passport"
        defaultValue={defaults?.passportNumber ?? undefined}
        placeholder="Passport ID"
        required
      />
      <Input
        label="First Name"
        name="client_name"
        defaultValue={defaults?.name ?? undefined}
        placeholder="John"
        pattern="[a-zA-Z\s\-']+"
        onChange={onLatinNameInput ? (e) => onLatinNameInput(e, "First Name") : undefined}
        required
      />
      <Input
        label="Last Name"
        name="client_surname"
        defaultValue={defaults?.surname ?? undefined}
        placeholder="Doe"
        pattern="[a-zA-Z\s\-']+"
        onChange={onLatinNameInput ? (e) => onLatinNameInput(e, "Last Name") : undefined}
        required
      />
      <Input
        label="Phone"
        name="client_phone"
        defaultValue={defaults?.phone ?? undefined}
        placeholder="+123456789"
        required
      />
      <Input
        label="WhatsApp"
        name="client_whatsapp"
        defaultValue={defaults?.whatsapp ?? undefined}
        placeholder="+123456789"
      />
      <Input
        label="Telegram"
        name="client_telegram"
        defaultValue={defaults?.telegram ?? undefined}
        placeholder="@username"
      />
      <Input
        label="Email"
        name="client_email"
        type="email"
        defaultValue={defaults?.email ?? undefined}
        placeholder="client@example.com"
      />
    </div>
  );
}
