'use client'

import * as React from 'react'
import { StyledSelect } from './StyledSelect'
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
  const options = Object.entries(AVAILABLE_ICONS).map(([name, Icon]) => ({
    value: name,
    label: name,
    icon: React.createElement(Icon, { className: "h-4 w-4 mr-2" })
  }))

  const formatOptionLabel = ({ value, label, icon }: any) => (
    <div className="flex items-center">
      {icon}
      {label}
    </div>
  )

  return (
    <StyledSelect
      value={options.find(option => option.value === value)}
      onChange={(option: any) => onChange(option?.value || '')}
      options={options}
      formatOptionLabel={formatOptionLabel}
      isClearable
      placeholder="Select an icon..."
    />
  )
}