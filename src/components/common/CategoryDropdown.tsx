import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Plus, Check } from 'lucide-react'
import { availableIcons, availableColors } from '../../lib/iconMap'
import type { UICategory } from '../../types/category'

type CategoryDropdownProps = {
  currentCategory: string
  currentColor: string
  categories: UICategory[]
  onSelect: (category: UICategory) => void
  onCreateNew: (data: { name: string; icon: string; color: string }) => void
}

export function CategoryDropdown({
  currentCategory,
  currentColor,
  categories,
  onSelect,
  onCreateNew,
}: CategoryDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [selectedIcon, setSelectedIcon] = useState(availableIcons[0])
  const [selectedColor, setSelectedColor] = useState(availableColors[0])
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setIsCreating(false)
        setNewName('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (isCreating && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isCreating])

  const handleSelect = (category: UICategory) => {
    onSelect(category)
    setIsOpen(false)
  }

  const handleCreateNew = () => {
    if (newName.trim()) {
      onCreateNew({
        name: newName.trim(),
        icon: selectedIcon.name,
        color: selectedColor,
      })
      setIsOpen(false)
      setIsCreating(false)
      setNewName('')
      setSelectedIcon(availableIcons[0])
      setSelectedColor(availableColors[0])
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={(e) => {
          e.stopPropagation()
          setIsOpen(!isOpen)
          setIsCreating(false)
        }}
        className="flex items-center gap-1 text-sm text-[#1F1410]/50 hover:text-[#1F1410]/70 transition-colors group"
      >
        <span
          className="transition-colors"
          style={{ color: isOpen ? currentColor : undefined }}
        >
          {currentCategory}
        </span>
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="w-3.5 h-3.5" />
        </motion.div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute left-0 top-full mt-2 z-50 bg-white rounded-xl overflow-hidden min-w-[220px]"
            style={{ boxShadow: '0 4px 24px rgba(31, 20, 16, 0.12)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {!isCreating ? (
              <>
                <div className="py-2 max-h-[240px] overflow-y-auto">
                  {categories.map((category, index) => {
                    const Icon = category.icon
                    const isSelected = category.name === currentCategory
                    return (
                      <motion.button
                        key={category.id || category.name}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.03, duration: 0.15 }}
                        onClick={() => handleSelect(category)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#1F1410]/[0.03] transition-colors"
                      >
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: `${category.color}15` }}
                        >
                          <Icon className="w-4 h-4" style={{ color: category.color }} />
                        </div>
                        <span className="flex-1 text-left text-sm font-medium text-[#1F1410]">
                          {category.name}
                        </span>
                        {isSelected && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                          >
                            <Check className="w-4 h-4" style={{ color: category.color }} />
                          </motion.div>
                        )}
                      </motion.button>
                    )
                  })}
                </div>
                <div className="border-t border-[#1F1410]/5">
                  <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    onClick={() => setIsCreating(true)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#1F1410]/[0.03] transition-colors"
                  >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#1F1410]/5">
                      <Plus className="w-4 h-4 text-[#1F1410]/60" />
                    </div>
                    <span className="text-sm font-medium text-[#1F1410]/60">
                      Create new category
                    </span>
                  </motion.button>
                </div>
              </>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.15 }}
                className="p-4"
              >
                <p className="text-xs font-semibold text-[#1F1410]/40 uppercase tracking-wide mb-3">
                  New Category
                </p>

                <input
                  ref={inputRef}
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateNew()
                    if (e.key === 'Escape') {
                      setIsCreating(false)
                      setNewName('')
                    }
                  }}
                  placeholder="Category name"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[#1F1410]/10 focus:border-[#1F1410]/20 focus:outline-none focus:ring-2 focus:ring-[#1F1410]/5 transition-all placeholder:text-[#1F1410]/30"
                />

                <p className="text-xs font-semibold text-[#1F1410]/40 uppercase tracking-wide mt-4 mb-2">
                  Icon
                </p>
                <div className="grid grid-cols-5 gap-1.5">
                  {availableIcons.slice(0, 15).map(({ icon: Icon, name }) => (
                    <button
                      key={name}
                      onClick={() => setSelectedIcon({ icon: Icon, name })}
                      className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                      style={{
                        backgroundColor:
                          selectedIcon.name === name ? `${selectedColor}20` : 'rgba(31, 20, 16, 0.03)',
                        color: selectedIcon.name === name ? selectedColor : 'rgba(31, 20, 16, 0.4)',
                      }}
                    >
                      <Icon className="w-4 h-4" />
                    </button>
                  ))}
                </div>

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
                        transform: selectedColor === color ? 'scale(1.15)' : 'scale(1)',
                        boxShadow:
                          selectedColor === color ? `0 0 0 2px white, 0 0 0 4px ${color}` : 'none',
                      }}
                    />
                  ))}
                </div>

                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => {
                      setIsCreating(false)
                      setNewName('')
                    }}
                    className="flex-1 px-3 py-2 text-sm font-medium text-[#1F1410]/60 rounded-lg hover:bg-[#1F1410]/5 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateNew}
                    disabled={!newName.trim()}
                    className="flex-1 px-3 py-2 text-sm font-medium text-white rounded-lg transition-all disabled:opacity-40"
                    style={{ backgroundColor: selectedColor }}
                  >
                    Create
                  </button>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
