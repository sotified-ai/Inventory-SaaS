import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ChevronDown, X } from 'lucide-react';

const SearchableSelect = ({
  value,
  onChange,
  options = [],
  placeholder = "Select an option",
  label,
  required = false,
  disabled = false,
  onCreateNew,
  searchBy = ['name'], // Fields to search by
  displayField = 'name', // Field to display in the dropdown
  keyField = 'id', // Unique key field
  className = '',
  allowNew = false,
  onInputChange,
  loading = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredOptions, setFilteredOptions] = useState([]);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  // Filter options based on search term
  useEffect(() => {
    if (!searchTerm) {
      setFilteredOptions(options);
      return;
    }

    const filtered = options.filter(option => {
      return searchBy.some(field => {
        const value = option[field];
        return value && value.toString().toLowerCase().includes(searchTerm.toLowerCase());
      });
    });

    setFilteredOptions(filtered);
  }, [searchTerm, options, searchBy]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle selection
  const handleSelect = (option) => {
    onChange(option);
    setIsOpen(false);
    setSearchTerm('');
  };

  // Handle clearing selection
  const handleClear = (e) => {
    e.stopPropagation();
    onChange(null);
    setSearchTerm('');
    inputRef.current?.focus();
  };

  // Handle creating new option
  const handleCreateNew = () => {
    if (onCreateNew && searchTerm) {
      onCreateNew(searchTerm);
      setIsOpen(false);
      setSearchTerm('');
    }
  };

  // Handle input change
  const handleInputChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    if (onInputChange) {
      onInputChange(value);
    }
  };

  // Handle input focus
  const handleInputFocus = () => {
    if (!disabled) {
      setIsOpen(true);
    }
  };

  // Handle key down for navigation
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    } else if (e.key === 'Enter' && isOpen && filteredOptions.length > 0) {
      handleSelect(filteredOptions[0]);
    }
  };

  // Get display value
  const displayValue = value ? value[displayField] : '';

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      
      <div className="relative">
        <Input
          ref={inputRef}
          type="text"
          value={searchTerm || displayValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          placeholder={displayValue ? '' : placeholder}
          disabled={disabled}
          className="pr-10"
        />
        
        {value && !searchTerm && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-8 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
            onClick={handleClear}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
          onClick={() => setIsOpen(!isOpen)}
          disabled={disabled}
        >
          <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </Button>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {loading ? (
            <div className="px-4 py-2 text-sm text-gray-500">Loading...</div>
          ) : filteredOptions.length > 0 ? (
            <>
              {filteredOptions.map((option) => (
                <div
                  key={option[keyField]}
                  className="px-4 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                  onClick={() => handleSelect(option)}
                >
                  <div className="font-medium text-sm">
                    {option[displayField]}
                  </div>
                  {searchBy.length > 1 && (
                    <div className="text-xs text-gray-600">
                      {searchBy
                        .filter(field => field !== displayField)
                        .map(field => option[field])
                        .filter(Boolean)
                        .join(' | ')}
                    </div>
                  )}
                </div>
              ))}
              
              {allowNew && searchTerm && !filteredOptions.some(opt => 
                searchBy.some(field => 
                  opt[field] && opt[field].toString().toLowerCase() === searchTerm.toLowerCase()
                )
              ) && (
                <div
                  className="px-4 py-2 hover:bg-blue-100 cursor-pointer border-t border-gray-200 text-blue-600 font-medium"
                  onClick={handleCreateNew}
                >
                  + Create "{searchTerm}"
                </div>
              )}
            </>
          ) : (
            <div className="px-4 py-2 text-sm text-gray-500">
              {allowNew && searchTerm ? (
                <div
                  className="hover:bg-blue-100 cursor-pointer text-blue-600 font-medium"
                  onClick={handleCreateNew}
                >
                  + Create "{searchTerm}"
                </div>
              ) : (
                "No options found"
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchableSelect;