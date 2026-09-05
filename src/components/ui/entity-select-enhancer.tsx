'use client';

import { useEffect } from 'react';

type EntityKind =
  | 'property'
  | 'renter'
  | 'contact'
  | 'owner'
  | 'provider'
  | 'guarantor'
  | 'user'
  | 'lead'
  | 'lease'
  | 'debt'
  | 'garage';

type SearchResult = {
  value: string;
  label: string;
  description?: string | null;
};

const ENTITY_BY_NAME: Record<string, EntityKind> = {
  propertyId: 'property',
  renterId: 'renter',
  contactId: 'contact',
  ownerContactId: 'owner',
  providerContactId: 'provider',
  guarantorContactId: 'guarantor',
  assignedUserId: 'user',
  agentId: 'user',
  inspectorUserId: 'user',
  userId: 'user',
  leadId: 'lead',
  propertyLeaseId: 'lease',
  leaseId: 'lease',
  debtId: 'debt',
  garageId: 'garage',
};

function normalize(value: unknown) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es-AR')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function getFieldLabel(select: HTMLSelectElement) {
  const wrappingLabel = select.closest('label');
  if (wrappingLabel) {
    const clone = wrappingLabel.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('select, input, textarea, button').forEach((node) => node.remove());
    const text = clone.textContent?.trim();
    if (text) return text;
  }

  const previous = select.previousElementSibling;
  if (previous?.tagName === 'LABEL') return previous.textContent?.trim() || '';

  const parentLabel = select.parentElement?.querySelector(':scope > label');
  if (parentLabel) return parentLabel.textContent?.trim() || '';

  return select.getAttribute('aria-label') || select.name || 'opción';
}

function inferEntity(select: HTMLSelectElement): EntityKind | null {
  const explicit = select.dataset.entitySearch as EntityKind | undefined;
  if (explicit) return explicit;
  if (select.multiple) return null;

  const label = normalize(getFieldLabel(select));

  if (label.includes('propietario')) return 'owner';
  if (label.includes('proveedor')) return 'provider';
  if (label.includes('garante')) return 'guarantor';

  const named = select.name ? ENTITY_BY_NAME[select.name] : null;
  if (named) return named;

  if ((label.includes('propiedad') || label.includes('inmueble')) && !label.includes('tipo')) return 'property';
  if (label.includes('inquilino')) return 'renter';
  if (label.includes('interesado') || label === 'contacto' || label.startsWith('contacto ')) return 'contact';
  if (label.includes('agente') || label.includes('responsable') || label.includes('inspector') || label === 'usuario') return 'user';
  if (label === 'lead' || label.startsWith('lead ')) return 'lead';
  if (label.includes('contrato') && !label.includes('tipo de contrato')) return 'lease';
  if (label.includes('deuda') || label.includes('cuota')) return 'debt';
  if (label === 'garaje' || label === 'garage' || label === 'cochera') return 'garage';

  return null;
}

function nativeSetSelectValue(select: HTMLSelectElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set;
  if (setter) setter.call(select, value);
  else select.value = value;

  select.dispatchEvent(new Event('input', { bubbles: true }));
  select.dispatchEvent(new Event('change', { bubbles: true }));
}

function localResults(select: HTMLSelectElement, query: string, limit = 15): SearchResult[] {
  const q = normalize(query);
  return Array.from(select.options)
    .filter((option) => option.value && (!q || normalize(option.textContent).includes(q)))
    .slice(0, limit)
    .map((option) => ({ value: option.value, label: option.textContent?.trim() || option.value }));
}

function selectedLabel(select: HTMLSelectElement) {
  return select.selectedOptions[0]?.textContent?.trim() || '';
}

function searchPlaceholder(label: string, entity: EntityKind) {
  const clean = label.replace(/\*/g, '').trim();
  if (clean && !/^opci[oó]n$/i.test(clean)) return `Buscar ${clean.toLocaleLowerCase('es-AR')}...`;

  const labels: Record<EntityKind, string> = {
    property: 'propiedad por código o dirección',
    renter: 'inquilino por apellido o DNI',
    contact: 'contacto por nombre, DNI o teléfono',
    owner: 'propietario por apellido, DNI o CUIT',
    provider: 'proveedor por nombre, CUIT o teléfono',
    guarantor: 'garante por apellido o DNI',
    user: 'usuario por nombre o email',
    lead: 'lead por título o contacto',
    lease: 'contrato por propiedad, inquilino o DNI',
    debt: 'deuda por inquilino, DNI o propiedad',
    garage: 'cochera por nombre o dirección',
  };

  return `Buscar ${labels[entity]}...`;
}

function enhanceSelect(select: HTMLSelectElement, entity: EntityKind) {
  if (select.dataset.entitySearchEnhanced === 'true') return () => {};
  select.dataset.entitySearchEnhanced = 'true';

  const originalDisplay = select.style.display;
  const originalRequired = select.required;
  const originalTabIndex = select.tabIndex;
  const originalAriaHidden = select.getAttribute('aria-hidden');
  const labelText = getFieldLabel(select);
  const hasEmptyOption = Array.from(select.options).some((option) => option.value === '');

  select.style.display = 'none';
  select.required = false;
  select.tabIndex = -1;
  select.setAttribute('aria-hidden', 'true');

  const wrapper = document.createElement('div');
  wrapper.className = 'relative w-full';
  wrapper.dataset.entitySearchWrapper = 'true';

  const input = document.createElement('input');
  input.type = 'text';
  input.autocomplete = 'off';
  input.placeholder = searchPlaceholder(labelText, entity);
  input.value = selectedLabel(select);
  input.required = originalRequired || !hasEmptyOption;
  input.setAttribute('role', 'combobox');
  input.setAttribute('aria-autocomplete', 'list');
  input.setAttribute('aria-expanded', 'false');
  input.className = 'w-full px-3 py-2 pr-9 border border-slate-200 bg-white rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400';

  const chevron = document.createElement('span');
  chevron.textContent = '⌄';
  chevron.className = 'absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-sm';

  wrapper.append(input, chevron);
  select.parentNode?.insertBefore(wrapper, select);

  const dropdown = document.createElement('div');
  dropdown.className = 'fixed z-[9999] hidden bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden';
  dropdown.setAttribute('role', 'listbox');
  document.body.appendChild(dropdown);

  let currentResults: SearchResult[] = [];
  let activeIndex = 0;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let blurTimer: ReturnType<typeof setTimeout> | null = null;
  let abortController: AbortController | null = null;
  let selectedValue = select.value;

  function positionDropdown() {
    if (dropdown.classList.contains('hidden')) return;

    const rect = wrapper.getBoundingClientRect();
    const availableBelow = window.innerHeight - rect.bottom - 12;
    const showAbove = availableBelow < 180 && rect.top > availableBelow;
    const availableHeight = showAbove ? rect.top - 12 : availableBelow;

    dropdown.style.left = `${Math.max(8, rect.left)}px`;
    dropdown.style.width = `${Math.max(240, rect.width)}px`;
    dropdown.style.maxWidth = 'calc(100vw - 16px)';
    dropdown.style.maxHeight = `${Math.max(120, Math.min(304, availableHeight))}px`;
    dropdown.style.top = showAbove ? 'auto' : `${rect.bottom + 4}px`;
    dropdown.style.bottom = showAbove ? `${window.innerHeight - rect.top + 4}px` : 'auto';
  }

  function closeDropdown() {
    dropdown.classList.add('hidden');
    input.setAttribute('aria-expanded', 'false');
  }

  function refreshActiveStyles() {
    dropdown.querySelectorAll<HTMLButtonElement>('button[data-result-index]').forEach((button) => {
      const index = Number(button.dataset.resultIndex);
      button.className = `w-full text-left px-3 py-2 rounded-lg flex flex-col transition-colors ${
        index === activeIndex ? 'bg-indigo-50' : 'hover:bg-slate-50'
      }`;
    });
  }

  function choose(result: SearchResult) {
    selectedValue = result.value;
    nativeSetSelectValue(select, result.value);
    input.value = result.label;
    input.setCustomValidity('');
    closeDropdown();
  }

  function renderResults(results: SearchResult[]) {
    currentResults = results;
    activeIndex = Math.min(activeIndex, Math.max(0, results.length - 1));
    dropdown.replaceChildren();

    if (results.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'px-3 py-4 text-xs text-slate-400 text-center';
      empty.textContent = 'No se encontraron resultados.';
      dropdown.appendChild(empty);
    } else {
      const list = document.createElement('div');
      list.className = 'max-h-[300px] overflow-y-auto p-1';

      results.forEach((result, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.dataset.resultIndex = String(index);
        button.className = `w-full text-left px-3 py-2 rounded-lg flex flex-col transition-colors ${
          index === activeIndex ? 'bg-indigo-50' : 'hover:bg-slate-50'
        }`;

        const title = document.createElement('span');
        title.className = 'block text-sm font-semibold text-slate-800 truncate';
        title.textContent = result.label;
        button.appendChild(title);

        if (result.description) {
          const description = document.createElement('span');
          description.className = 'block text-[11px] text-slate-500 mt-0.5 truncate';
          description.textContent = result.description;
          button.appendChild(description);
        }

        button.addEventListener('mouseenter', () => {
          activeIndex = index;
          refreshActiveStyles();
        });
        button.addEventListener('mousedown', (event) => {
          event.preventDefault();
          choose(result);
        });
        list.appendChild(button);
      });

      dropdown.appendChild(list);
    }

    dropdown.classList.remove('hidden');
    input.setAttribute('aria-expanded', 'true');
    positionDropdown();
  }

  async function remoteSearch(query: string) {
    abortController?.abort();
    abortController = new AbortController();

    try {
      const response = await fetch(
        `/api/search/entities?entity=${encodeURIComponent(entity)}&q=${encodeURIComponent(query)}&limit=20`,
        {
          signal: abortController.signal,
          credentials: 'same-origin',
          cache: 'no-store',
        }
      );

      if (!response.ok) return;

      const payload = await response.json();
      const allowed = new Set(Array.from(select.options).map((option) => option.value).filter(Boolean));
      const remote: SearchResult[] = Array.isArray(payload.results)
        ? payload.results.filter((result: SearchResult) => allowed.has(result.value))
        : [];

      if (remote.length > 0 || query.trim()) renderResults(remote);
    } catch (error: any) {
      if (error?.name !== 'AbortError') console.warn('[entity-select-search]', error);
    }
  }

  function runSearch(query: string) {
    renderResults(localResults(select, query, 15));
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => remoteSearch(query), query.trim() ? 160 : 0);
  }

  function syncFromSelect() {
    selectedValue = select.value;
    if (document.activeElement !== input) input.value = selectedLabel(select);
    input.setCustomValidity('');
  }

  function handleFocus() {
    if (blurTimer) clearTimeout(blurTimer);
    input.select();
    activeIndex = 0;
    runSearch('');
  }

  function handleInput() {
    if (selectedValue) {
      selectedValue = '';
      nativeSetSelectValue(select, '');
    }

    input.setCustomValidity(input.value.trim() ? 'Elegí una opción de los resultados.' : '');
    activeIndex = 0;
    runSearch(input.value);
  }

  function handleBlur() {
    blurTimer = setTimeout(() => {
      closeDropdown();
      input.setCustomValidity('');
      input.value = select.value ? selectedLabel(select) : '';
    }, 140);
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      activeIndex = Math.min(activeIndex + 1, Math.max(0, currentResults.length - 1));
      refreshActiveStyles();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      activeIndex = Math.max(activeIndex - 1, 0);
      refreshActiveStyles();
    } else if (
      event.key === 'Enter' &&
      currentResults[activeIndex] &&
      !dropdown.classList.contains('hidden')
    ) {
      event.preventDefault();
      choose(currentResults[activeIndex]);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      closeDropdown();
      input.value = selectedLabel(select);
    }
  }

  function handleViewportChange() {
    positionDropdown();
  }

  input.addEventListener('focus', handleFocus);
  input.addEventListener('input', handleInput);
  input.addEventListener('blur', handleBlur);
  input.addEventListener('keydown', handleKeyDown);
  select.addEventListener('change', syncFromSelect);
  window.addEventListener('resize', handleViewportChange);
  window.addEventListener('scroll', handleViewportChange, true);

  return () => {
    abortController?.abort();
    if (debounceTimer) clearTimeout(debounceTimer);
    if (blurTimer) clearTimeout(blurTimer);

    input.removeEventListener('focus', handleFocus);
    input.removeEventListener('input', handleInput);
    input.removeEventListener('blur', handleBlur);
    input.removeEventListener('keydown', handleKeyDown);
    select.removeEventListener('change', syncFromSelect);
    window.removeEventListener('resize', handleViewportChange);
    window.removeEventListener('scroll', handleViewportChange, true);

    dropdown.remove();
    wrapper.remove();
    select.style.display = originalDisplay;
    select.required = originalRequired;
    select.tabIndex = originalTabIndex;

    if (originalAriaHidden === null) select.removeAttribute('aria-hidden');
    else select.setAttribute('aria-hidden', originalAriaHidden);

    delete select.dataset.entitySearchEnhanced;
  };
}

export function EntitySelectEnhancer() {
  useEffect(() => {
    const cleanups = new Map<HTMLSelectElement, () => void>();
    let scheduled = false;

    function scan() {
      scheduled = false;

      for (const [select, cleanup] of cleanups) {
        if (!document.contains(select)) {
          cleanup();
          cleanups.delete(select);
        }
      }

      document.querySelectorAll<HTMLSelectElement>('select').forEach((select) => {
        if (cleanups.has(select) || select.dataset.entitySearchEnhanced === 'true') return;

        const entity = inferEntity(select);
        if (!entity) return;

        cleanups.set(select, enhanceSelect(select, entity));
      });
    }

    function scheduleScan() {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(scan);
    }

    scan();

    const observer = new MutationObserver(scheduleScan);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      cleanups.forEach((cleanup) => cleanup());
      cleanups.clear();
    };
  }, []);

  return null;
}
