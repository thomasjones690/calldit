'use client'

import Select from 'react-select'
import { useTheme } from 'next-themes'
import { 
  AlertCircle, ArrowRight, Check, Circle, 
  Heart, Star, Trophy, Target, Zap,
  Calendar, Flag, Globe, Home, Music,
  Settings, User, Video, Mail, Map
} from 'lucide-react'

const AVAILABLE_ICONS = {
  AlertCircle, ArrowRight, Check, Circle,
  Heart, Star, Trophy, Target, Zap,
  Calendar, Flag, Globe, Home, Music,
  Settings, User, Video, Mail, Map
}

interface IconPickerProps {
  value: string
  onChange: (value: string) => void
}

export function IconPicker({ value, onChange }: IconPickerProps) {
  const options = Object.keys(AVAILABLE_ICONS).map(iconName => ({
    value: iconName,
    label: iconName,
    icon: AVAILABLE_ICONS[iconName as keyof typeof AVAILABLE_ICONS]
  }))

  const customStyles = {
    control: (base: any) => ({
      ...base,
      backgroundColor: 'hsl(var(--background))',
      borderColor: 'hsl(var(--border))',
      '&:hover': {
        borderColor: 'hsl(var(--border))'
      }
    }),
    menu: (base: any) => ({
      ...base,
      backgroundColor: 'hsl(var(--popover))',
      borderColor: 'hsl(var(--border))',
      boxShadow: 'var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), 0 4px 6px -1px rgb(0 0 0 / 0.1)'
    }),
    option: (base: any, state: any) => ({
      ...base,
      backgroundColor: state.isFocused 
        ? 'hsl(var(--accent))' 
        : 'hsl(var(--popover))',
      color: state.isFocused 
        ? 'hsl(var(--accent-foreground))' 
        : 'hsl(var(--popover-foreground))',
      '&:hover': {
        backgroundColor: 'hsl(var(--accent))',
        color: 'hsl(var(--accent-foreground))'
      }
    }),
    menuList: (base: any) => ({
      ...base,
      backgroundColor: 'hsl(var(--popover))',
      padding: 0
    }),
    singleValue: (base: any) => ({
      ...base,
      color: 'hsl(var(--foreground))'
    }),
    input: (base: any) => ({
      ...base,
      color: 'hsl(var(--foreground))'
    }),
    placeholder: (base: any) => ({
      ...base,
      color: 'hsl(var(--muted-foreground))'
    })
  }

  return (
    <Select
      options={options}
      value={options.find(option => option.value === value)}
      onChange={(newValue) => onChange(newValue?.value || '')}
      styles={customStyles}
      formatOptionLabel={({ value, icon: Icon }) => (
        <div className="flex items-center gap-2">
          {Icon && <Icon className="h-4 w-4" />}
          <span>{value}</span>
        </div>
      )}
      placeholder="Select an icon..."
      isClearable
    />
  )
}