import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  ChevronDown,
  Shield,
  Sparkles,
} from 'lucide-react'
import { availableIcons, availableColors } from '../../lib/iconMap'
import type { CategoryType } from '../../types/category'

export type AddCategoryDropdownProps = {
  onCreateCategory: (data: {
    name: string
    icon: string
    color: string
    budget: string
    type: CategoryType
  }) => void
}

export function AddCategoryDropdown({ onCreateCategory }: AddCategoryDropdownProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [selectedIcon, setSelectedIcon] = useState(availableIcons[0])
  const [selectedColor, setSelectedColor] = useState(availableColors[6])
  const [newBudget, setNewBudget] = useState('')
  const [selectedType, setSelectedType] = useState<CategoryType>('need')

  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const resetForm = () => {
    setNewCategoryName('')
    setSelectedIcon(availableIcons[0])
    setSelectedColor(availableColors[6])
    setNewBudget('')
    setSelectedType('need')
  }

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false)
        resetForm()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Focus input when dropdown opens
  useEffect(() => {
    if (isDropdownOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isDropdownOpen])

  const handleCreate = () => {
    if (newCategoryName.trim()) {
      onCreateCategory({
        name: newCategoryName.trim(),
        icon: selectedIcon.name,
        color: selectedColor,
        budget: newBudget,
        type: selectedType,
      })
      setIsDropdownOpen(false)
      resetForm()
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <motion.button
        initial={{
          opacity: 0,
        }}
        animate={{
          opacity: 1,
        }}
        transition={{
          delay: 0.3,
        }}
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
          isDropdownOpen
            ? 'text-[#6366F1] bg-[#6366F1]/10'
            : 'text-[#1F1410]/60 hover:text-[#6366F1] hover:bg-[#6366F1]/5'
        }`}
      >
        <Plus className="w-4 h-4" />
        <span>Add Category</span>
        <motion.div
          animate={{
            rotate: isDropdownOpen ? 180 : 0,
          }}
          transition={{
            duration: 0.2,
          }}
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </motion.div>
      </motion.button>

      <AnimatePresence>
        {isDropdownOpen && (
          <motion.div
            initial={{
              opacity: 0,
              y: -8,
              scale: 0.96,
            }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
            }}
            exit={{
              opacity: 0,
              y: -8,
              scale: 0.96,
            }}
            transition={{
              duration: 0.15,
              ease: 'easeOut',
            }}
            className="absolute right-0 top-full mt-2 z-50 bg-white rounded-xl overflow-hidden w-72"
            style={{
              boxShadow: '0 4px 24px rgba(31, 20, 16, 0.12)',
            }}
          >
            <div className="p-4">
              <p className="text-xs font-semibold text-[#1F1410]/40 uppercase tracking-wide mb-3">
                New Category
              </p>

              {/* Category Name */}
              <input
                ref={inputRef}
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreate()
                  if (e.key === 'Escape') {
                    setIsDropdownOpen(false)
                    resetForm()
                  }
                }}
                placeholder="Category name"
                className="w-full px-3 py-2 text-sm rounded-lg border border-[#1F1410]/10 focus:border-[#6366F1]/30 focus:outline-none focus:ring-2 focus:ring-[#6366F1]/10 transition-all placeholder:text-[#1F1410]/30"
              />

              {/* Type Selection */}
              <p className="text-xs font-semibold text-[#1F1410]/40 uppercase tracking-wide mt-4 mb-2">
                Type
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedType('need')}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    selectedType === 'need'
                      ? 'bg-[#10B981]/10 text-[#10B981] ring-2 ring-[#10B981]/20'
                      : 'bg-[#1F1410]/[0.03] text-[#1F1410]/60 hover:bg-[#1F1410]/[0.06]'
                  }`}
                >
                  <Shield className="w-4 h-4" />
                  Need
                </button>
                <button
                  onClick={() => setSelectedType('want')}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    selectedType === 'want'
                      ? 'bg-[#A855F7]/10 text-[#A855F7] ring-2 ring-[#A855F7]/20'
                      : 'bg-[#1F1410]/[0.03] text-[#1F1410]/60 hover:bg-[#1F1410]/[0.06]'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  Want
                </button>
              </div>

              {/* Budget Amount */}
              <p className="text-xs font-semibold text-[#1F1410]/40 uppercase tracking-wide mt-4 mb-2">
                Monthly Budget
              </p>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#1F1410]/40 text-sm">
                  $
                </span>
                <input
                  type="text"
                  value={newBudget}
                  onChange={(e) =>
                    setNewBudget(e.target.value.replace(/[^0-9]/g, ''))
                  }
                  placeholder="0"
                  className="w-full pl-7 pr-3 py-2 text-sm rounded-lg border border-[#1F1410]/10 focus:border-[#6366F1]/30 focus:outline-none focus:ring-2 focus:ring-[#6366F1]/10 transition-all placeholder:text-[#1F1410]/30"
                />
              </div>

              {/* Icon Selection */}
              <p className="text-xs font-semibold text-[#1F1410]/40 uppercase tracking-wide mt-4 mb-2">
                Icon
              </p>
              <div className="grid grid-cols-5 gap-1.5">
                {availableIcons.slice(0, 15).map(({ icon: Icon, name }) => (
                  <button
                    key={name}
                    onClick={() =>
                      setSelectedIcon({
                        icon: Icon,
                        name,
                      })
                    }
                    className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                    style={{
                      backgroundColor:
                        selectedIcon.name === name
                          ? `${selectedColor}20`
                          : 'rgba(31, 20, 16, 0.03)',
                      color:
                        selectedIcon.name === name
                          ? selectedColor
                          : 'rgba(31, 20, 16, 0.4)',
                    }}
                  >
                    <Icon className="w-4 h-4" />
                  </button>
                ))}
              </div>

              {/* Color Selection */}
              <p className="text-xs font-semibold text-[#1F1410]/40 uppercase tracking-wide mt-4 mb-2">
                Color
              </p>
              <div className="flex gap-1.5 flex-wrap">
                {availableColors.map((color) => (
                  <button
                    key={color}
                    onClick={() => setSelectedColor(color)}
                    className="w-7 h-7 rounded-full transition-transform"
                    style={{
                      backgroundColor: color,
                      transform:
                        selectedColor === color
                          ? 'scale(1.15)'
                          : 'scale(1)',
                      boxShadow:
                        selectedColor === color
                          ? `0 0 0 2px white, 0 0 0 4px ${color}`
                          : 'none',
                    }}
                  />
                ))}
              </div>

              {/* Actions */}
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => {
                    setIsDropdownOpen(false)
                    resetForm()
                  }}
                  className="flex-1 px-3 py-2 text-sm font-medium text-[#1F1410]/60 rounded-lg hover:bg-[#1F1410]/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={!newCategoryName.trim()}
                  className="flex-1 px-3 py-2 text-sm font-medium text-white rounded-lg transition-all disabled:opacity-40"
                  style={{
                    backgroundColor: selectedColor,
                  }}
                >
                  Create
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
