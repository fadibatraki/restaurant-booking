"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import styles from "./restaurants/page.module.css";

type RestaurantSuggestion = {
    id: string;
    name: string;
    address: string;
};

type RestaurantsSearchProps = {
    initialQuery: string;
};

export function RestaurantsSearch({ initialQuery }: RestaurantsSearchProps) {
    const router = useRouter();
    const pathname = usePathname();
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [isPending, startTransition] = useTransition();
    const [query, setQuery] = useState(initialQuery);
    const [suggestions, setSuggestions] = useState<RestaurantSuggestion[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);

    useEffect(() => {
        setQuery(initialQuery);
    }, [initialQuery]);

    useEffect(() => {
        function handlePointerDown(event: MouseEvent) {
            if (!containerRef.current?.contains(event.target as Node)) {
                setIsOpen(false);
                setHighlightedIndex(-1);
            }
        }

        document.addEventListener("mousedown", handlePointerDown);
        return () => document.removeEventListener("mousedown", handlePointerDown);
    }, []);

    useEffect(() => {
        const trimmedQuery = query.trim();

        if (!trimmedQuery) {
            setSuggestions([]);
            setError(null);
            setIsLoading(false);
            setHighlightedIndex(-1);
            return;
        }

        const controller = new AbortController();
        const timeoutId = window.setTimeout(async () => {
            setIsLoading(true);
            setError(null);

            try {
                const response = await fetch(
                    `/api/restaurants?q=${encodeURIComponent(trimmedQuery)}`,
                    {
                        signal: controller.signal,
                    },
                );

                if (!response.ok) {
                    throw new Error("تعذر تحميل الاقتراحات");
                }

                const data = (await response.json()) as RestaurantSuggestion[];
                setSuggestions(data.slice(0, 6));
                setIsOpen(true);
                setHighlightedIndex(data.length ? 0 : -1);
            } catch (fetchError) {
                if ((fetchError as Error).name === "AbortError") {
                    return;
                }

                setSuggestions([]);
                setError("تعذر تحميل الاقتراحات حالياً.");
                setIsOpen(true);
                setHighlightedIndex(-1);
            } finally {
                setIsLoading(false);
            }
        }, 180);

        return () => {
            controller.abort();
            window.clearTimeout(timeoutId);
        };
    }, [query]);

    const hasTypedQuery = useMemo(() => query.trim().length > 0, [query]);

    function applyQuery(nextQuery: string) {
        const trimmedQuery = nextQuery.trim();
        const nextUrl = trimmedQuery
            ? `${pathname}?q=${encodeURIComponent(trimmedQuery)}`
            : pathname;

        setQuery(trimmedQuery);
        setIsOpen(false);
        setHighlightedIndex(-1);

        startTransition(() => {
            router.replace(nextUrl, { scroll: false });
        });
    }

    function handleSuggestionSelect(suggestion: RestaurantSuggestion) {
        applyQuery(suggestion.name);
    }

    function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
        if (!isOpen && event.key === "Enter" && hasTypedQuery) {
            event.preventDefault();
            applyQuery(query);
            return;
        }

        if (!isOpen) {
            return;
        }

        if (event.key === "ArrowDown") {
            event.preventDefault();
            setHighlightedIndex((current) =>
                suggestions.length ? (current + 1) % suggestions.length : -1,
            );
            return;
        }

        if (event.key === "ArrowUp") {
            event.preventDefault();
            setHighlightedIndex((current) =>
                suggestions.length ? (current <= 0 ? suggestions.length - 1 : current - 1) : -1,
            );
            return;
        }

        if (event.key === "Escape") {
            setIsOpen(false);
            setHighlightedIndex(-1);
            return;
        }

        if (event.key === "Enter") {
            event.preventDefault();

            if (highlightedIndex >= 0 && suggestions[highlightedIndex]) {
                handleSuggestionSelect(suggestions[highlightedIndex]);
                return;
            }

            applyQuery(query);
        }
    }

    return (
        <div ref={containerRef} className={styles.searchAutocomplete}>
            <div className="input-shell">
                <label htmlFor="restaurant-search" className="input-label">
                    ابحث عن المطاعم
                </label>
                <input
                    id="restaurant-search"
                    type="search"
                    value={query}
                    placeholder="ابحث بالاسم أو العنوان"
                    autoComplete="off"
                    role="combobox"
                    aria-expanded={isOpen}
                    aria-controls="restaurant-suggestions"
                    aria-autocomplete="list"
                    aria-activedescendant={
                        highlightedIndex >= 0 ? `restaurant-suggestion-${highlightedIndex}` : undefined
                    }
                    onChange={(event) => {
                        setQuery(event.target.value);
                        setIsOpen(true);
                    }}
                    onFocus={() => {
                        if (hasTypedQuery) {
                            setIsOpen(true);
                        }
                    }}
                    onKeyDown={handleKeyDown}
                />
            </div>

            <div className={styles.searchMeta}>
                <p className={styles.searchHint}>
                    اكتب لعرض المطاعم المطابقة فوراً، ثم اضغط Enter لتطبيق البحث الحالي.
                </p>
                {query ? (
                    <button
                        type="button"
                        className={`button-ghost ${styles.clearButton}`}
                        onClick={() => applyQuery("")}
                    >
                        مسح
                    </button>
                ) : null}
            </div>

            {isOpen && hasTypedQuery ? (
                <div id="restaurant-suggestions" className={`${styles.dropdown} surface`} role="listbox">
                    {isLoading ? (
                        <div className={styles.dropdownState}>جارٍ البحث عن المطاعم...</div>
                    ) : error ? (
                        <div className={`${styles.dropdownState} ${styles.dropdownError}`}>{error}</div>
                    ) : suggestions.length === 0 ? (
                        <div className={styles.dropdownState}>لا توجد مطاعم مطابقة.</div>
                    ) : (
                        <div className={styles.suggestionList}>
                            {suggestions.map((suggestion, index) => (
                                <button
                                    key={suggestion.id}
                                    id={`restaurant-suggestion-${index}`}
                                    type="button"
                                    role="option"
                                    aria-selected={highlightedIndex === index}
                                    className={`${styles.suggestionButton} ${highlightedIndex === index ? styles.suggestionActive : ""
                                        }`}
                                    onMouseEnter={() => setHighlightedIndex(index)}
                                    onClick={() => handleSuggestionSelect(suggestion)}
                                >
                                    <span className={styles.suggestionName}>{suggestion.name}</span>
                                    <span className={styles.suggestionAddress}>{suggestion.address}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            ) : null}

            {isPending ? <p className={styles.searchStatus}>جارٍ تحديث النتائج...</p> : null}
        </div>
    );
}