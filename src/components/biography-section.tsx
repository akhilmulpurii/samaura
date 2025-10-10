'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog'

interface BiographySectionProps {
  biography: string
  personName?: string
}

export function BiographySection({ biography, personName }: BiographySectionProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="mb-6">
      <h3 className="text-lg font-semibold mb-3">Biography</h3>
      
      {/* Clamped biography text */}
      <div className="text-md leading-relaxed max-w-4xl">
        <p className="line-clamp-3">
          {biography}
        </p>
        
        {/* Read more button */}
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button 
              variant="link" 
              className="p-0 h-auto font-normal text-blue-500 hover:text-blue-600 mt-2"
            >
              Read more
            </Button>
          </DialogTrigger>
          
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {personName ? `${personName} - Biography` : 'Biography'}
              </DialogTitle>
            </DialogHeader>
            
            <div className="mt-4">
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {biography}
              </p>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
