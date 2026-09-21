import { Search, X } from "lucide-react";

import { Button } from "@kumix/ui/ui/button";
import { Input } from "@kumix/ui/ui/input";
import { useStore } from "@/stores/app-store";

export function SearchBar() {
  const query = useStore((s) => s.searchQuery);
  const setQuery = useStore((s) => s.setSearchQuery);

  return (
    <div className="relative px-3 py-2">
      <Search className="pointer-events-none absolute top-1/2 left-5 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        id="search-input"
        type="text"
        placeholder="Search accounts... (Ctrl+F)"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="h-9 pr-8 pl-8 text-sm"
      />
      {query && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-1/2 right-4 size-6 -translate-y-1/2"
          onClick={() => setQuery("")}
        >
          <X className="size-3" />
        </Button>
      )}
    </div>
  );
}
