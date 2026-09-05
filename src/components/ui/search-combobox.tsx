'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';

export type SearchComboboxOption = {
  value: string;
  label: string;
  description?: string | null;
  keywords?: string | string[] | null;
  disabled?: boolean;
};

type SearchComboboxProps = {
  name: string;
  label?: string;
  options: SearchComboboxOption[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  emptyText?: string;
  required?: boolean;
  disabled?: boolean;
  allowClear?: boolean;
  className?: string;
  maxResults?: number;
};

function normalizeSearch(value: unknown) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es-AR')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function optionSearchText(option: SearchComboboxOption) {
  const keywords = Array.isArray(option.keywords)
    ? option.keywords.join(' ')
    : option.keywords || '';
  return normalizeSearch(`${option.label} ${option.description || ''} ${keywords}`);
}

export function SearchCombobox({
  name,
  label,
  options,
  value,
  defaultValue = '',
  onChange,
  placeholder = 'Escribí para buscar...',
  emptyText = 'No se encontraron resultados.',
  required = false,
  disabled = false,
  allowClear = true,
  className = '',
  maxResults = 12,
}: SearchComboboxProps) {
  const controlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(defaultValue);
  const selectedValue = controlled ? value || '' : internalValue;
  const selectedOption = useMemo(
    () => options.find((option) => option.value === selectedValue) || null,
    [options, selectedValue]
  );

  const [query, setQuery] = useState(selectedOption?.label || '');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) setQuery(selectedOption?.label || '');
  }, [selectedOption, open]);

  const filteredOptions = useMemo(() => {
    const normalizedQuery = normalizeSearch(query);
    const source = normalizedQuery
      ? options.filter((option) => optionSearchText(option).includes(normalizedQuery))
      : options;
    return source.filter((option) => !option.disabled).slice(0, maxResults);
  }, [options, query, maxResults]);

  useEffect(() => {
    setActiveIndex((current) => Math.min(current, Math.max(0, filteredOptions.length - 1)));
  }, [filteredOptions.length]);

  function commit(nextValue: string) {
    if (!controlled) setInternalValue(nextValue);
    onChange?.(nextValue);
    const option = options.find((item) => item.value === nextValue);
    setQuery(option?.label || '');
    setOpen(false);
    setActiveIndex(0);
  }

  function clear() {
    if (disabled) return;
    commit('');
  }

  function handleInputChange(nextQuery: string) {
    setQuery(nextQuery);
    setOpen(true);
    setActiveIndex(0);

    if (selectedValue) {
      if (!controlled) setInternalValue('');
      onChange?.('');
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => Math.min(index + 1, Math.max(0, filteredOptions.length - 1)));
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => Math.max(index - 1, 0));
      return;
    }
    if (event.key === 'Enter' && open && filteredOptions[activeIndex]) {
      event.preventDefault();
      commit(filteredOptions[activeIndex].value);
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      setQuery(selectedOption?.label || '');
      setOpen(false);
    }
  }

  function handleBlur() {
    blurTimer.current = setTimeout(() => {
      setOpen(false);
      setQuery(selectedOption?.label || '');
    }, 120);
  }

  function handleFocus() {
    if (blurTimer.current) clearTimeout(blurTimer.current);
    if (!disabled) {
      setOpen(true);
      setActiveIndex(0);
    }
  }

  return (
    <label className={`block ${className}`}>
      {label && <span className="block text-xs font-semibold text-slate-700 mb-1">{label}</span>}
      <input type="hidden" name={name} value={selectedValue} />
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          required={required && !selectedValue}
          disabled={disabled}
          autoComplete="off"
          placeholder={placeholder}
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          onFocus={handleFocus}
          onBlur={handleBlur}
          onChange={(event) => handleInputChange(event.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full pl-9 pr-16 py-2 border border-slate-200 bg-white rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 disabled:bg-slate-100 disabled:text-slate-400"
        />

        {allowClear && selectedValue && !disabled ? (
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={clear}
            className="absolute right-8 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 rounded"
            aria-label="Limpiar selección"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : null}
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />

        {open && !disabled && (
          <div className="absolute z-[80] left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
            <div className="max-h-64 overflow-y-auto p-1">
              {filteredOptions.length === 0 ? (
                <div className="px-3 py-4 text-xs text-slate-400 text-center">{emptyText}</div>
              ) : (
                filteredOptions.map((option, index) => {
                  const selected = option.value === selectedValue;
                  const active = index === activeIndex;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onMouseEnter={() => setActiveIndex(index)}
                      onMouseDown={(event) => {
                        event.preventDefault();
                        commit(option.value);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg flex items-start gap-2 transition-colors ${
                        active ? 'bg-indigo-50' : 'hover:bg-slate-50'
                      }`}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-slate-800 truncate">{option.label}</span>
                        {option.description ? (
                          <span className="block text-[11px] text-slate-500 mt-0.5 truncate">{option.description}</span>
                        ) : null}
                      </span>
                      {selected ? <Check className="w-4 h-4 text-indigo-600 mt-0.5 flex-shrink-0" /> : null}
                    </button>
                  );
                })
              )}
            </div>
            {options.length > maxResults && filteredOptions.length === maxResults ? (
              <div className="px-3 py-2 border-t border-slate-100 bg-slate-50 text-[10px] text-slate-400">
                Mostrando los primeros {maxResults}. Seguí escribiendo para acotar la búsqueda.
              </div>
            ) : null}
          </div>
        )}
      </div>
      {required && !selectedValue && query ? (
        <span className="block text-[10px] text-slate-400 mt-1">Elegí una opción de los resultados.</span>
      ) : null}
    </label>
  );
}
