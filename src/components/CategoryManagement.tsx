'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/lib/supabase/auth-context'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { IconPicker } from './IconPicker'
import { useToast } from './ui/use-toast'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table'
import { Plus, Pencil, Trash2, Check, Circle, Heart, Star, Trophy, Target, Zap, Calendar, Flag, Globe, Home, Music, Settings, User, Video, Mail, Map, ArrowRight, AlertCircle } from 'lucide-react'

// Define available icons map
export const AVAILABLE_ICONS = {
  AlertCircle: AlertCircle, ArrowRight: ArrowRight, Check: Check, Circle: Circle,
  Heart: Heart, Star: Star, Trophy: Trophy, Target: Target, Zap: Zap,
  Calendar: Calendar, Flag: Flag, Globe: Globe, Home: Home, Music: Music,
  Settings: Settings, User: User, Video: Video, Mail: Mail, Map: Map
}

interface Category {
  id: string
  name: string
  icon?: string
}

export function CategoryManagement() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [categories, setCategories] = useState<Category[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [selectedIcon, setSelectedIcon] = useState('')

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    const { data } = await supabase
      .from('categories')
      .select('*')
      .order('name')
    setCategories(data || [])
  }

  const handleSubmit = async () => {
    if (!newCategoryName.trim() || !user) return

    const operation = editingCategory ? 'update' : 'insert'
    const query = supabase.from('categories')

    const data = {
      name: newCategoryName.trim(),
      icon: selectedIcon,
      ...(operation === 'insert' && { created_by: user.id })
    }

    const { error } = operation === 'update'
      ? await query.update(data).eq('id', editingCategory?.id || '')
      : await query.insert(data)

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
      return
    }

    fetchCategories()
    handleClose()
  }

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id)

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
      return
    }

    fetchCategories()
  }

  const handleEdit = (category: Category) => {
    setEditingCategory(category)
    setNewCategoryName(category.name)
    setSelectedIcon(category.icon || '')
    setIsOpen(true)
  }

  const handleClose = () => {
    setIsOpen(false)
    setEditingCategory(null)
    setNewCategoryName('')
    setSelectedIcon('')
  }

  const IconComponent = ({ iconName }: { iconName: string }) => {
    const Icon = AVAILABLE_ICONS[iconName as keyof typeof AVAILABLE_ICONS]
    return Icon ? <Icon className="h-4 w-4" /> : null
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Categories</h2>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Category
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingCategory ? 'Edit Category' : 'Add Category'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Name</Label>
                <Input
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Enter category name"
                />
              </div>
              <div>
                <Label>Icon</Label>
                <IconPicker
                  value={selectedIcon}
                  onChange={setSelectedIcon}
                />
              </div>
              <Button onClick={handleSubmit}>
                {editingCategory ? 'Update' : 'Create'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]">Icon</TableHead>
            <TableHead>Name</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {categories.map((category) => (
            <TableRow key={category.id}>
              <TableCell className="w-[50px]">
                {category.icon && <IconComponent iconName={category.icon} />}
              </TableCell>
              <TableCell>{category.name}</TableCell>
              <TableCell className="w-[100px]">
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(category)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(category.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}