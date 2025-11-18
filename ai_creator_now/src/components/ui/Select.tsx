import React, { useState, useRef, useEffect } from 'react';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps {
  options: SelectOption[];
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
}

export const Select: React.FC<SelectProps> = ({
  options,
  value,
  defaultValue,
  placeholder = '请选择...',
  disabled = false,
  className = '',
  onChange,
  onBlur,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedValue, setSelectedValue] = useState(value || defaultValue || '');
  const selectRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value !== undefined) {
      setSelectedValue(value);
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        onBlur?.();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onBlur]);

  const handleSelect = (optionValue: string) => {
    setSelectedValue(optionValue);
    setIsOpen(false);
    onChange?.(optionValue);
  };

  const selectedOption = options.find(option => option.value === selectedValue);
  const displayValue = selectedOption ? selectedOption.label : placeholder;

  const baseClasses = 'relative w-full';
  const triggerClasses = `
    flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background
    placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50
    ${isOpen ? 'ring-2 ring-ring ring-offset-2' : ''}
  `;

  return (
    <div className={`${baseClasses} ${className}`} ref={selectRef}>
      <button
        type="button"
        className={triggerClasses}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className={`block truncate ${!selectedValue ? 'text-muted-foreground' : ''}`}>
          {displayValue}
        </span>
        <svg
          className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-60 overflow-auto rounded-md border border-input bg-popover p-1 text-popover-foreground shadow-md">
          <ul role="listbox" className="p-0">
            {options.map((option) => (
              <li
                key={option.value}
                className={`
                  relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none
                  hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground
                  ${option.disabled ? 'cursor-not-allowed opacity-50' : ''}
                  ${selectedValue === option.value ? 'bg-accent text-accent-foreground' : ''}
                `}
                onClick={() => !option.disabled && handleSelect(option.value)}
                role="option"
                aria-selected={selectedValue === option.value}
              >
                <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                  {selectedValue === option.value && (
                    <svg
                      className="h-4 w-4"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </span>
                <span className="block truncate">{option.label}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};