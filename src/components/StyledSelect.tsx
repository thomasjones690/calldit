import Select, { Props, components } from "react-select"
import { ChevronDown, X } from "lucide-react"
import { cn } from "@/lib/utils"

const DropdownIndicator = (props: any) => {
  return (
    <components.DropdownIndicator {...props}>
      <ChevronDown className="h-4 w-4" />
    </components.DropdownIndicator>
  )
}

const ClearIndicator = (props: any) => {
  return (
    <components.ClearIndicator {...props}>
      <X className="h-4 w-4" />
    </components.ClearIndicator>
  )
}

const MultiValueRemove = (props: any) => {
  return (
    <components.MultiValueRemove {...props}>
      <X className="h-3 w-3" />
    </components.MultiValueRemove>
  )
}

const controlStyles = {
  base: "border rounded-md bg-background hover:cursor-pointer",
  focus: "border-stone-500 ring-1 ring-stone-500",
  nonFocus: "border-input hover:border-stone-400"
}

const selectStyles = {
  placeholder: "text-muted-foreground pl-1 py-0.5",
  input: "pl-1 py-0.5",
  valueContainer: "p-1 gap-1",
  singleValue: "leading-7 ml-1 text-foreground",
  multiValue: "bg-stone-100 dark:bg-stone-800 rounded items-center py-0.5 pl-2 pr-1 gap-1.5",
  multiValueLabel: "leading-6 py-0.5 text-foreground",
  multiValueRemove: "border border-stone-200 dark:border-stone-700 bg-background hover:bg-destructive/50 hover:text-destructive-foreground text-muted-foreground hover:border-destructive rounded-md",
  indicatorsContainer: "p-1 gap-1",
  clearIndicator: "text-muted-foreground p-1 rounded-md hover:bg-destructive/50 hover:text-destructive-foreground",
  indicatorSeparator: "bg-stone-300 dark:bg-stone-700",
  dropdownIndicator: "p-1 hover:bg-accent text-muted-foreground rounded-md hover:text-accent-foreground",
  menu: "p-1 mt-2 border border-input bg-background rounded-md",
  groupHeading: "ml-3 mt-2 mb-1 text-muted-foreground text-sm",
  option: {
    base: "hover:cursor-pointer px-3 py-2 rounded",
    focus: "bg-accent",
    selected: "text-muted-foreground after:content-['✓'] after:ml-2 after:text-primary"
  },
  noOptionsMessage: "text-muted-foreground p-2 bg-muted border border-dashed border-input rounded-sm"
}

export function StyledSelect(props: Props) {
  return (
    <Select
      unstyled
      styles={{
        input: (base) => ({
          ...base,
          "input:focus": {
            boxShadow: "none"
          }
        }),
        multiValueLabel: (base) => ({
          ...base,
          whiteSpace: "normal",
          overflow: "visible"
        }),
        control: (base) => ({
          ...base,
          transition: "none"
        })
      }}
      components={{ DropdownIndicator, ClearIndicator, MultiValueRemove }}
      classNames={{
        control: ({ isFocused }) =>
          cn(
            isFocused ? controlStyles.focus : controlStyles.nonFocus,
            controlStyles.base
          ),
        placeholder: () => selectStyles.placeholder,
        input: () => selectStyles.input,
        valueContainer: () => selectStyles.valueContainer,
        singleValue: () => selectStyles.singleValue,
        multiValue: () => selectStyles.multiValue,
        multiValueLabel: () => selectStyles.multiValueLabel,
        multiValueRemove: () => selectStyles.multiValueRemove,
        indicatorsContainer: () => selectStyles.indicatorsContainer,
        clearIndicator: () => selectStyles.clearIndicator,
        indicatorSeparator: () => selectStyles.indicatorSeparator,
        dropdownIndicator: () => selectStyles.dropdownIndicator,
        menu: () => selectStyles.menu,
        groupHeading: () => selectStyles.groupHeading,
        option: ({ isFocused, isSelected }) =>
          cn(
            isFocused && selectStyles.option.focus,
            isSelected && selectStyles.option.selected,
            selectStyles.option.base
          ),
        noOptionsMessage: () => selectStyles.noOptionsMessage
      }}
      {...props}
    />
  )
}