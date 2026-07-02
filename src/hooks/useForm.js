import { useState, useCallback } from 'react'

export function useForm(initialState) {
  const [formData, setFormData] = useState(initialState)
  const [errors, setErrors] = useState({})

  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    setErrors(prev => ({ ...prev, [name]: null }))
  }, [])

  const setFieldError = useCallback((field, error) => {
    setErrors(prev => ({ ...prev, [field]: error }))
  }, [])

  const clearErrors = useCallback(() => {
    setErrors({})
  }, [])

  const resetForm = useCallback(() => {
    setFormData(initialState)
    setErrors({})
  }, [initialState])

  const validate = useCallback((validations) => {
    const newErrors = {}
    let isValid = true

    for (const [field, rules] of Object.entries(validations)) {
      for (const rule of rules) {
        const error = rule(formData[field])
        if (error) {
          newErrors[field] = error
          isValid = false
          break
        }
      }
    }

    setErrors(newErrors)
    return isValid
  }, [formData])

  return {
    formData,
    setFormData,
    errors,
    setErrors: setErrors,
    setFieldError,
    handleInputChange,
    clearErrors,
    resetForm,
    validate
  }
}
