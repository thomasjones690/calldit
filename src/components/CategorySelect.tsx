'use client'

import { useState, useEffect } from 'react'
import Select from 'react-select'
import { supabase } from '@/lib/supabase/client'
import * as icons from 'lucide-react'

interface Category {
  id: string
  name: string
  icon?: string
}

interface CategoryOption {
  value: string
  label: string
  icon?: string
}

interface CategorySelectProps {
  value?: string
  onChange: (value: string) => void
}

export function CategorySelect({ value, onChange }: CategorySelectProps) {
  const [categories, setCategories] = useState<Category[]>([])
  const [options, setOptions] = useState<CategoryOption[]>([])

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    const { data } = await supabase
      .from('categories')
      .select('*')
      .order('name')
    
    if (data) {
      setCategories(data)
      setOptions(data.map(category => ({
        value: category.id,
        label: category.name,
        icon: category.icon
      })))
    }
  }

  const IconComponent = ({ iconName }: { iconName: string }) => {
    const Icon = (icons as any)[iconName]
    return Icon ? <Icon className="h-4 w-4" /> : null
  }

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
      backgroundColor: 'hsl(var(--background))',
      borderColor: 'hsl(var(--border))'
    }),
    option: (base: any, state: any) => ({
      ...base,
      backgroundColor: state.isFocused 
        ? 'hsl(var(--accent))' 
        : 'hsl(var(--background))',
      color: 'hsl(var(--foreground))',
      '&:hover': {
        backgroundColor: 'hsl(var(--accent))'
      }
    })
  }

  return (
    <Select
      options={options}
      value={options.find(option => option.value === value)}
      onChange={(newValue) => onChange(newValue?.value || '')}
      styles={customStyles}
      formatOptionLabel={(option: CategoryOption) => (
        <div className="flex items-center gap-2">
          {option.icon && <IconComponent iconName={option.icon} />}
          <span>{option.label}</span>
        </div>
      )}
    />
  )
}