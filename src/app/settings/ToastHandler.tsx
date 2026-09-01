'use client'
import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import toast from 'react-hot-toast'

export default function ToastHandler() {
  const params = useSearchParams()

  useEffect(() => {
    const success = params.get('success')
    const error = params.get('error')
    if (success) toast.success(success)
    if (error) toast.error(error)
  }, [params])

  return null
}
