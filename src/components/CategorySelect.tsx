import * as React from 'react'
import { useState, useEffect } from 'react'
import { StyledSelect } from './StyledSelect'
import { supabase } from '@/lib/supabase/client'
import { AVAILABLE_ICONS } from './CategoryManagement'

interface CategorySelectProps {
  value: string
  onChange: (value: string) => void
}

export function CategorySelect({ value, onChange }: CategorySelectProps) {
  const [categories, setCategories] = useState<any[]>([])

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('id, name, icon')
      .order('name')
    
    if (!error && data) {
      setCategories(data)
    }
  }

  const options = categories.map(category => ({
    value: category.id,
    label: category.name,
    icon: category.icon && AVAILABLE_ICONS[category.icon as keyof typeof AVAILABLE_ICONS] 
      ? React.createElement(AVAILABLE_ICONS[category.icon as keyof typeof AVAILABLE_ICONS], { 
          className: "h-4 w-4 mr-2" 
        })
      : null
  }))

  const formatOptionLabel = ({ label, icon }: any) => (
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
      placeholder="Select a category..."
    />
  )
}