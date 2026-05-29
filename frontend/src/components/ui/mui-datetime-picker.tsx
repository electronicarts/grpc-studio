// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { useMemo } from 'react'
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import dayjs, { Dayjs } from 'dayjs'
import utc from 'dayjs/plugin/utc'
import { useDarkMode } from '@/features/theme/hooks/useDarkMode'

dayjs.extend(utc)

interface MuiDateTimePickerProps {
  value: string | undefined
  onChange: (value: string | undefined) => void
  disabled?: boolean
  className?: string
}

export function MuiDateTimePicker({ value, onChange, disabled, className }: MuiDateTimePickerProps) {
  // Try to use dark mode context, fallback to false if not available (e.g., in tests)
  let isDarkMode = false
  try {
    const darkModeHook = useDarkMode()
    isDarkMode = darkModeHook.darkMode
  } catch {
    // Not wrapped in DarkModeProvider, use default
    isDarkMode = false
  }

  // Create theme using CSS variables from globals.css
  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: isDarkMode ? 'dark' : 'light',
        },
        components: {
          MuiTextField: {
            styleOverrides: {
              root: {
                '& .MuiInputBase-root': {
                  fontSize: '0.875rem',
                  borderRadius: '0.375rem',
                },
              },
            },
          },
        },
      }),
    [isDarkMode]
  )

  const dayjsValue = value ? dayjs(value).utc() : null

  const handleChange = (newValue: Dayjs | null) => {
    if (newValue && newValue.isValid()) {
      onChange(newValue.utc().toISOString())
    } else {
      onChange(undefined)
    }
  }

  return (
    <ThemeProvider theme={theme}>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <DateTimePicker
          value={dayjsValue}
          onChange={handleChange}
          disabled={disabled}
          timezone="UTC"
          slotProps={{
            textField: {
              size: 'small',
              fullWidth: true,
              className: className,
            },
            actionBar: {
              actions: ['clear', 'today'],
            },
          }}
        />
      </LocalizationProvider>
    </ThemeProvider>
  )
}
