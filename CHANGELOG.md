# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added

#### Security Enhancements
- **File Upload Security**: Added comprehensive file validation with magic byte checking
  - Validates file signatures for JPEG, PNG, GIF, and WebP formats
  - Prevents malicious file uploads by checking actual file content, not just MIME type
  - Validates image metadata (width, height) and enforces maximum dimensions (10000x10000 pixels)
  - Rejects empty files and files with mismatched MIME types
- **HTML Sanitization**: Implemented backend HTML sanitization for listing descriptions
  - Removes dangerous HTML tags (script, iframe, object, embed, etc.)
  - Strips event handlers (onclick, onerror, etc.)
  - Removes javascript: protocol links
  - Allows only safe formatting tags (p, br, strong, em, u, ul, ol, li, font)

#### Validation Improvements
- **Year Validation**: Enhanced year field validation across the application
  - Maximum year is now current year + 1 (allows future model years)
  - Validates that year is a positive integer
  - Minimum year is 1900
  - Applied to both listing creation form and search filters
- **Input Normalization**: Added automatic normalization for numeric fields
  - Price and mileage fields normalize "000", "0000" etc. to "0" on blur
  - Improves data consistency and user experience
- **Form Field Validation**: Enhanced validation for registration and profile forms
  - Added maxLength restrictions for firstName, lastName (50 chars)
  - Added maxLength restriction for companyName (100 chars)
  - Added input filtering for names (only letters, spaces, hyphens)

#### Testing
- **Unit Tests**: Added comprehensive unit tests for security features
  - `html-sanitizer.spec.ts`: 20+ tests for HTML sanitization
  - `upload.service.spec.ts`: Tests for magic byte validation, metadata checking, size limits
  - `ListingForm.test.tsx`: Tests for year validation, zero normalization
  - `SearchFilters.test.tsx`: Tests for range validations and input filtering
- **Integration Tests**: Added integration tests for API validations
  - Year validation in listing creation
  - HTML sanitization in listing descriptions
  - File upload security (magic bytes, empty files, MIME type mismatches)

### Changed
- Updated year validation logic to be consistent across listing form and search filters
- Improved HTML sanitization to remove dangerous tags with their content
- Enhanced file upload error messages for better user feedback

### Fixed
- Fixed year validation to properly handle edge cases (current year + 1)
- Fixed HTML sanitization to properly remove script tags and their content
- Fixed file upload validation to check actual file content, not just MIME type

## [Previous Releases]

(Add previous release notes here)

