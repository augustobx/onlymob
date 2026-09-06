'use client';

import { Search } from 'lucide-react';

export function WorkspaceSearch({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return <div className="ui-search"><Search /><input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} /></div>;
}
