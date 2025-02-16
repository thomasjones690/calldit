import * as React from 'react'
import { useState, useEffect } from 'react'
import { StyledSelect } from './StyledSelect'
import { supabase } from '@/lib/supabase/client'
import { AVAILABLE_ICONS } from './CategoryManagement'
import { PlusCircle } from 'lucide-react'
import { Button } from './ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { components } from 'react-select'
import { toast } from './ui/use-toast'
import { useAuth } from '@/lib/supabase/auth-context'

interface CategorySelectProps {
  value: string
  onChange: (value: string) => void
}

export function CategorySelect({ value, onChange }: CategorySelectProps) {
  const [categories, setCategories] = useState<any[]>([])
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const user = useAuth()

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

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return
    
    setIsSubmitting(true)
    const { data, error } = await supabase
      .from('categories')
      .insert([{ name: newCategoryName.trim() }])
      .select()
      .single()

    if (!error && data) {
      setCategories([...categories, data])
      onChange(data.id)
      setIsCreateOpen(false)
      setNewCategoryName('')
    }
    setIsSubmitting(false)
  }

  const options = [
    ...categories.map(category => ({
      value: category.id,
      label: category.name,
      icon: category.icon && AVAILABLE_ICONS[category.icon as keyof typeof AVAILABLE_ICONS] 
        ? React.createElement(AVAILABLE_ICONS[category.icon as keyof typeof AVAILABLE_ICONS], { 
            className: "h-4 w-4 mr-2" 
          })
        : null
    })),
    {
      value: 'create-new',
      label: 'Create new category...',
      icon: <PlusCircle className="h-4 w-4 mr-2" />
    }
  ]

  const handleSelectChange = (option: any) => {
    if (option?.value === 'create-new') {
      setIsCreateOpen(true)
    } else {
      onChange(option?.value || '')
    }
  }

  const handleNoOptionsSelect = async () => {
    if (!inputValue.trim()) return
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to create categories",
        variant: "destructive",
      })
      return
    }
    
    setIsSubmitting(true)
    const { data, error } = await supabase
      .from('categories')
      .insert([{ 
        name: inputValue.trim(),
        created_by: user.user?.id,
        icon: null
      }])
      .select()
      .single()

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    } else if (data) {
      setCategories([...categories, data])
      onChange(data.id)
      setInputValue('')
    }
    setIsSubmitting(false)
  }

  const NoOptionsMessage = (props: any) => {
    if (isSubmitting) {
      return (
        <components.NoOptionsMessage {...props}>
          <div className="flex items-center gap-2 text-muted-foreground">
            <PlusCircle className="h-4 w-4 animate-spin" />
            Creating...
          </div>
        </components.NoOptionsMessage>
      )
    }

    return (
      <components.NoOptionsMessage {...props}>
        <div 
          className="flex items-center gap-2 cursor-pointer hover:text-primary"
          onClick={() => handleNoOptionsSelect()}
        >
          <PlusCircle className="h-4 w-4" />
          Create "{inputValue}"
        </div>
      </components.NoOptionsMessage>
    )
  }

  const handleInputChange = (newValue: string) => {
    setInputValue(newValue)
  }

  return (
    <>
      <StyledSelect
        value={options.find(option => option.value === value)}
        onChange={handleSelectChange}
        onInputChange={handleInputChange}
        options={options}
        formatOptionLabel={({ label, icon }: any) => (
          <div className="flex items-center">
            {icon}
            {label}
          </div>
        )}
        components={{ NoOptionsMessage }}
        onKeyDown={(e: React.KeyboardEvent) => {
          if (e.key === 'Enter' && !options.length) {
            handleNoOptionsSelect()
          }
        }}
        isClearable
        placeholder="Select or create a category..."
      />

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Category</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Enter category name..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateCategory} disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}