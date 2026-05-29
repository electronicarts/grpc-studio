// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import dayjs, { Dayjs } from 'dayjs'
import utc from 'dayjs/plugin/utc'

dayjs.extend(utc)

interface MuiDateTimePickerProps {
  value: string | undefined
  onChange: (value: string | undefined) => void
  disabled?: boolean
  className?: string
}

export function MuiDateTimePicker({ value, onChange, disabled, className }: MuiDateTimePickerProps) {
  // Create a theme that matches your existing design
  const theme = createTheme({
    palette: {
      mode: document.documentElement.classList.contains('dark') ? 'dark' : 'light',
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
  })

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
