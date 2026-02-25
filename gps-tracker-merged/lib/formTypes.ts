export type FieldType =
  | "text"
  | "email"
  | "password"
  | "tel"
  | "number"
  | "select"
  | "textarea"
  | "checkbox"
  | "file"
  | "date";

export interface FormOption {
  label: string;
  value: string;
}

export interface FormOptionGroup {
  label: string;
  options: FormOption[];
}

export interface FormField {
  name: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  required?: boolean;
  options?: FormOption[]; // For select type
  groups?: FormOptionGroup[]; // For grouped select type
  rows?: number; // For textarea type
  icon?: React.ReactNode;
}

export interface DynamicModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  fields: FormField[];
  initialData?: Record<string, string | number | boolean | File>;
  onSubmit: (
    data: Record<string, string | number | boolean | File>,
  ) => Promise<void> | void;
  variant?: "light" | "dark";

  submitLabel?: string;
}
