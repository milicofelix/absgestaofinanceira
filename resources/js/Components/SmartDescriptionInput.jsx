import { useEffect, useRef, useState } from 'react';
import axios from 'axios';

export default function SmartDescriptionInput({
  value,
  onChange,
  onSelectSuggestion,
  disabled = false,
  placeholder = 'Digite a descrição...',
  queryParams = {},
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [highlighted, setHighlighted] = useState(-1);

  const debounceRef = useRef(null);
  const wrapperRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
        setHighlighted(-1);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (disabled) return;

    const term = (value || '').trim();

    clearTimeout(debounceRef.current);

    if (term.length < 2) {
      setItems([]);
      setOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      try {
        setLoading(true);

        const { data } = await axios.get(route('transactions.suggestions.descriptions'), {
          params: {
            q: term,
            ...queryParams,
          },
        });

        setItems(Array.isArray(data) ? data : []);
        setOpen(true);
        setHighlighted(-1);
      } catch (error) {
        setItems([]);
        setOpen(false);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(debounceRef.current);
  }, [value, disabled, queryParams]);

  function applySuggestion(item) {
    onChange(item.description);
    onSelectSuggestion?.(item);
    setOpen(false);
    setHighlighted(-1);
  }

  function handleKeyDown(e) {
    if (!open || items.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted((prev) => (prev < items.length - 1 ? prev + 1 : 0));
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted((prev) => (prev > 0 ? prev - 1 : items.length - 1));
    }

    if (e.key === 'Enter' && highlighted >= 0) {
      e.preventDefault();
      applySuggestion(items[highlighted]);
    }

    if (e.key === 'Escape') {
      setOpen(false);
      setHighlighted(-1);
    }
  }

  return (
    <div className="relative" ref={wrapperRef}>
      <input
        disabled={disabled}
        className="mt-1 w-full rounded-lg border-gray-300 bg-white text-sm focus:border-emerald-500 focus:ring-emerald-500 disabled:bg-gray-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:disabled:bg-slate-900"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => items.length > 0 && setOpen(true)}
        onKeyDown={handleKeyDown}
        autoComplete="off"
      />

      {loading && (
        <div className="mt-1 text-xs text-gray-500 dark:text-slate-400">
          Buscando sugestões...
        </div>
      )}

      {open && items.length > 0 && (
        <div className="absolute z-30 mt-2 max-h-72 w-full overflow-auto rounded-xl border border-gray-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-900">
          {items.map((item, index) => {
            const active = index === highlighted;

            return (
              <button
                key={`${item.description}-${index}`}
                type="button"
                className={[
                  'flex w-full flex-col px-3 py-2 text-left transition',
                  active
                    ? 'bg-emerald-50 dark:bg-slate-800'
                    : 'hover:bg-gray-50 dark:hover:bg-slate-800/80',
                ].join(' ')}
                onMouseEnter={() => setHighlighted(index)}
                onClick={() => applySuggestion(item)}
              >
                <span className="text-sm font-medium text-gray-900 dark:text-slate-100">
                  {item.description}
                </span>

                <span className="mt-0.5 text-xs text-gray-500 dark:text-slate-400">
                  Usado {item.usage_count}x
                  {item.payment_method ? ` • ${item.payment_method}` : ''}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}