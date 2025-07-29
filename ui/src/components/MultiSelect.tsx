"use client";

import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { CheckIcon, ChevronDownIcon } from "@radix-ui/react-icons";
import { cn } from "@/lib/utils"; // utilitaire de classes conditionnelles

type MultiSelectProps = {
  value: string[];
  onValueChange: (values: string[]) => void;
  placeholder?: string;
  children: React.ReactNode;
  className?: string;
};

export function MultiSelect({
  value,
  onValueChange,
  placeholder = "Select…",
  children,
  className,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const toggleValue = (v: string) => {
    const newArr = value.includes(v) ? value.filter(x => x !== v) : [...value, v];
    onValueChange(newArr);
  };

  return (
    <SelectPrimitive.Root open={open} onOpenChange={setOpen}>
      <SelectPrimitive.Trigger className={cn("flex items-center justify-between p-2 border rounded", className)}>
        <span>{value.length > 0 ? value.join(", ") : placeholder}</span>
        <ChevronDownIcon />
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Content className="border rounded bg-white">
        <SelectPrimitive.ScrollUpButton />
        <SelectPrimitive.Viewport className="p-2">
          {React.Children.map(children, child =>
            React.isValidElement(child) && child.props.value
              ? React.cloneElement(child as React.ReactElement<any>, {
                  checked: value.includes(child.props.value),
                  onClick: () => toggleValue(child.props.value),
                })
              : child
          )}
        </SelectPrimitive.Viewport>
        <SelectPrimitive.ScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Root>
  );
}

// MultiSelectItem à utiliser dans SearchBar
export type MultiSelectItemProps = {
  value: string;
  children: React.ReactNode;
  checked?: boolean;
  onClick?: () => void;
};
export const MultiSelectItem = React.forwardRef<HTMLDivElement, MultiSelectItemProps>(
  ({ value, children, checked = false, onClick }, ref) => (
    <div
      ref={ref}
      onClick={onClick}
      className={cn("flex items-center p-2 cursor-pointer hover:bg-gray-100", checked && "bg-gray-200")}
    >
      <CheckIcon className={cn("mr-2", checked ? "opacity-100" : "opacity-0")} />
      {children}
    </div>
  )
);
MultiSelectItem.displayName = "MultiSelectItem";
