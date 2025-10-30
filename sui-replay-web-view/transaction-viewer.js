// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

class TransactionViewer {
    constructor() {
        this.files = {
            'transaction_data': null,
            'transaction_effects': null,
            'transaction_gas_report': null,
            'replay_cache_summary': null,
            'move_call_info': null
        };

        this.requiredFiles = [
            'transaction_data.json',
            'transaction_effects.json',
            'transaction_gas_report.json',
            'replay_cache_summary.json',
            'move_call_info.json'
        ];

        this.setupEventListeners();
    }

    // Explorer configuration mapping
    getExplorerConfig() {
        const explorers = {
            'suiscan': {
                mainnet: {
                    baseUrl: 'https://suiscan.xyz/mainnet',
                    paths: {
                        transaction: 'tx',        // Transaction: suiscan -> tx
                        address: 'account',       // Account: suiscan -> account
                        object: 'object',         // Object: suiscan -> object
                        package: 'object'         // Package: suiscan -> object
                    }
                },
                testnet: {
                    baseUrl: 'https://suiscan.xyz/testnet',
                    paths: {
                        transaction: 'tx',        // Transaction: suiscan -> tx
                        address: 'account',       // Account: suiscan -> account
                        object: 'object',         // Object: suiscan -> object
                        package: 'object'         // Package: suiscan -> object
                    }
                }
            },
            'suivision': {
                mainnet: {
                    baseUrl: 'https://suivision.xyz',
                    paths: {
                        transaction: 'txblock',   // Transaction: suivision -> txblock
                        address: 'account',       // Account: suivision -> account
                        object: 'object',         // Object: suivision -> object
                        package: 'package'        // Package: suivision -> package
                    }
                },
                testnet: {
                    baseUrl: 'https://testnet.suivision.xyz',
                    paths: {
                        transaction: 'txblock',   // Transaction: suivision -> txblock
                        address: 'account',       // Account: suivision -> account
                        object: 'object',         // Object: suivision -> object
                        package: 'package'        // Package: suivision -> package
                    }
                }
            }
        };

        const selectedExplorer = document.getElementById('explorer-select').value;
        return explorers[selectedExplorer] || explorers['suiscan'];
    }

    getCurrentNetwork() {
        // Try to get network from the loaded cache data
        if (this.cacheData && this.cacheData.network) {
            return this.cacheData.network;
        }
        // Default fallback (though this shouldn't happen with the new network field)
        return 'mainnet';
    }


    createExplorerLink(id, type, text = null) {
        const displayText = text || id;

        // Get network from cache data if available
        const network = this.getCurrentNetwork();

        // Only create links for mainnet and testnet
        if (network !== 'mainnet' && network !== 'testnet') {
            return this.encodeHTML(displayText);
        }

        const explorerConfig = this.getExplorerConfig();
        const config = explorerConfig[network];

        if (!config) {
            return this.encodeHTML(displayText);
        }

        let path;

        // Map our internal types to the explorer's path structure
        switch (type) {
            case 'txblock':
                path = config.paths.transaction;
                break;
            case 'account':
                path = config.paths.address;
                break;
            case 'object':
                path = config.paths.object;
                break;
            case 'package':
                path = config.paths.package;
                break;
            default:
                return this.encodeHTML(displayText);
        }

        // Validate and sanitize URL components
        const baseUrl = this.validateExplorerUrl(config.baseUrl);
        const safePath = this.sanitizePath(path);
        const safeId = this.sanitizeId(id);

        if (!baseUrl) {
            return this.encodeHTML(displayText);
        }

        const url = `${baseUrl}/${safePath}/${safeId}`;
        const safeDisplayText = this.encodeHTML(displayText);
        const safeUrl = this.encodeHTML(url);
        return `<a href="${safeUrl}" target="_blank" class="explorer-link">${safeDisplayText}</a>`;
    }

    /**
     * Validates explorer URL to prevent injection attacks.
     * Only allows HTTPS URLs with safe characters.
     */
    validateExplorerUrl(url) {
        try {
            const trimmed = url.trim();
            if (
                trimmed.startsWith('https://')
                && !/[<>"']/g.test(trimmed)
                && /^https:\/\/[A-Za-z0-9.-]+(:\d+)?(\/.*)?$/.test(trimmed)
            ) {
                return trimmed;
            }
        } catch (e) {
            // Invalid URL, fall through to default
        }
        return 'https://suiscan.xyz';
    }

    /**
     * HTML-encode text to prevent breaking out of tags and XSS attacks.
     */
    encodeHTML(s) {
        return String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    /**
     * Validates explorer URLs to ensure they are safe HTTPS URLs
     */
    validateExplorerUrl(url) {
        try {
            const trimmed = String(url).trim();
            if (!trimmed.startsWith('https://')) {
                return null;
            }
            if (/[<>"']/g.test(trimmed)) {
                return null;
            }
            if (!/^https:\/\/[A-Za-z0-9.-]+(:\d+)?(\/.*)?$/.test(trimmed)) {
                return null;
            }
            return trimmed;
        } catch (e) {
            return null;
        }
    }

    /**
     * Encodes HTML entities to prevent XSS
     */
    encodeHTML(s) {
        return String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    /**
     * Sanitizes ID parameters - allows only safe characters for blockchain identifiers.
     */
    sanitizeId(id) {
        // For blockchain IDs, allow only alphanumeric, hyphens, underscores and 'x' prefix
        return String(id).replace(/[^a-zA-Z0-9\-_x]/g, '');
    }

    /**
     * Sanitizes URL path components
     */
    sanitizePath(path) {
        // Allow only alphanumeric characters, hyphens, underscores, and slashes for paths
        return String(path).replace(/[^a-zA-Z0-9\-_\/]/g, '');
    }

    // Sortable table functionality
    makeSortable(tableId) {
        const table = document.getElementById(tableId);
        if (!table) return;

        const thead = table.querySelector('thead');
        if (!thead) return; // Skip tables without proper thead structure

        const headers = table.querySelectorAll('thead th');
        headers.forEach((header, index) => {
            header.style.cursor = 'pointer';
            header.style.userSelect = 'none';
            header.classList.add('sortable-header');

            // Add sort indicator container
            const originalText = header.innerHTML;
            header.innerHTML = `${originalText} <span class="sort-indicator"></span>`;

            header.addEventListener('click', () => {
                this.sortTable(table, index, header);
            });
        });
    }

    sortTable(table, columnIndex, header) {
        const tbody = table.querySelector('tbody');
        const rows = Array.from(tbody.querySelectorAll('tr'));

        // Determine current sort direction
        const isAscending = header.classList.contains('sort-asc');

        // Remove all sort classes from headers
        table.querySelectorAll('th').forEach(th => {
            th.classList.remove('sort-asc', 'sort-desc');
            const indicator = th.querySelector('.sort-indicator');
            if (indicator) indicator.textContent = '';
        });

        // Determine new sort direction
        const sortAscending = !isAscending;

        // Add appropriate class and indicator
        if (sortAscending) {
            header.classList.add('sort-asc');
            header.querySelector('.sort-indicator').textContent = ' ↑';
        } else {
            header.classList.add('sort-desc');
            header.querySelector('.sort-indicator').textContent = ' ↓';
        }

        // Sort rows
        rows.sort((a, b) => {
            const aCell = a.cells[columnIndex];
            const bCell = b.cells[columnIndex];

            if (!aCell || !bCell) return 0;

            // Get text content for comparison (strip HTML tags)
            const aText = aCell.textContent || aCell.innerText || '';
            const bText = bCell.textContent || bCell.innerText || '';

            // Try to parse as numbers
            const aNum = parseFloat(aText.replace(/[^0-9.-]/g, ''));
            const bNum = parseFloat(bText.replace(/[^0-9.-]/g, ''));

            let comparison = 0;

            // If both are numbers, sort numerically
            if (!isNaN(aNum) && !isNaN(bNum)) {
                comparison = aNum - bNum;
            } else {
                // Sort alphabetically
                comparison = aText.localeCompare(bText);
            }

            return sortAscending ? comparison : -comparison;
        });

        // Reorder rows in DOM
        rows.forEach(row => tbody.appendChild(row));
    }

    formatNumber(num) {
        // Format number with underscore thousands separator
        if (num === null || num === undefined || num === '') {
            return 'N/A';
        }

        const numStr = num.toString();
        // Only format if it's a valid number (positive or negative)
        if (!/^-?\d+$/.test(numStr)) {
            return numStr;
        }

        // Handle negative numbers
        if (numStr.startsWith('-')) {
            const positiveNum = numStr.substring(1);
            return '-' + positiveNum.replace(/\B(?=(\d{3})+(?!\d))/g, '_');
        }

        return numStr.replace(/\B(?=(\d{3})+(?!\d))/g, '_');
    }

    formatUnsignedInteger(num) {
        // Format unsigned integer with underscore thousands separator
        // No truncation - let the caller handle that if needed
        if (num === null || num === undefined || num === '') {
            return 'N/A';
        }

        const numStr = num.toString();
        // Only format if it's a valid positive integer
        if (!/^\d+$/.test(numStr)) {
            return numStr;
        }

        // Add underscore separators and return the full formatted number
        return numStr.replace(/\B(?=(\d{3})+(?!\d))/g, '_');
    }

    setupCustomTooltips() {
        // Remove existing tooltip event listeners to avoid duplicates
        document.querySelectorAll('.custom-tooltip').forEach(tooltip => {
            tooltip.removeEventListener('mouseenter', this.showTooltip);
            tooltip.removeEventListener('mouseleave', this.scheduleHideTooltip);
        });

        // Add new tooltip event listeners
        const tooltips = document.querySelectorAll('.custom-tooltip');

        tooltips.forEach((tooltip) => {
            tooltip.addEventListener('mouseenter', this.showTooltip.bind(this));
            tooltip.addEventListener('mouseleave', this.scheduleHideTooltip.bind(this));
        });
    }

    showTooltip(event) {
        const element = event.target;
        const tooltipText = element.getAttribute('data-tooltip');

        // Create tooltip element
        let tooltip = document.getElementById('active-tooltip');
        if (!tooltip) {
            tooltip = document.createElement('div');
            tooltip.id = 'active-tooltip';
            tooltip.style.cssText = `
                position: fixed;
                background: linear-gradient(135deg, #2a2a2a, #1a1a1a);
                color: #ffffff;
                padding: 8px 12px;
                border-radius: 6px;
                border: 1px solid #4a9eff;
                font-size: 11px;
                z-index: 1000;
                pointer-events: auto;
                font-family: Monaco, Menlo, Consolas, monospace;
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
                max-width: 350px;
                word-break: break-word;
                opacity: 0;
                transition: opacity 0.2s ease-in-out;
                user-select: text;
                cursor: text;
            `;
            document.body.appendChild(tooltip);
        }

        tooltip.textContent = tooltipText;

        // Position tooltip
        const rect = element.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();

        let left = rect.left;
        let top = rect.top - tooltipRect.height - 10;

        // Adjust if tooltip would go off the right edge
        if (left + tooltipRect.width > window.innerWidth - 10) {
            left = window.innerWidth - tooltipRect.width - 10;
        }

        // Adjust if tooltip would go off the left edge
        if (left < 10) {
            left = 10;
        }

        // Adjust if tooltip would go off the top
        if (top < 10) {
            top = rect.bottom + 10;
        }

        tooltip.style.left = left + 'px';
        tooltip.style.top = top + 'px';
        tooltip.style.opacity = '1';

        // Add tooltip hover listeners to keep it visible when hovering over it
        tooltip.addEventListener('mouseenter', this.cancelHideTooltip.bind(this));
        tooltip.addEventListener('mouseleave', this.scheduleHideTooltip.bind(this));

        // Clear any existing hide timeout
        this.cancelHideTooltip();
    }

    scheduleHideTooltip() {
        // Schedule tooltip to hide after a short delay
        this.tooltipHideTimeout = setTimeout(() => {
            this.hideTooltip();
        }, 300);
    }

    cancelHideTooltip() {
        // Cancel any scheduled tooltip hiding
        if (this.tooltipHideTimeout) {
            clearTimeout(this.tooltipHideTimeout);
            this.tooltipHideTimeout = null;
        }
    }

    hideTooltip() {
        const tooltip = document.getElementById('active-tooltip');
        if (tooltip) {
            tooltip.style.opacity = '0';
            setTimeout(() => {
                if (tooltip.parentNode) {
                    tooltip.parentNode.removeChild(tooltip);
                }
            }, 200);
        }
    }

    setupEventListeners() {
        // Directory input
        document.getElementById('directory-input').addEventListener('input', () => {
            // Note: Text input for path can't directly load files due to security restrictions
            // This is mainly for display purposes
        });

        // Directory browser button
        document.getElementById('browse-directory').addEventListener('click', () => {
            document.getElementById('directory-picker').click();
        });

        // Directory picker (webkitdirectory)
        document.getElementById('directory-picker').addEventListener('change', (e) => {
            this.handleDirectorySelect(e.target.files);
        });

        // Drag and drop
        const dropArea = document.getElementById('drag-drop-area');
        dropArea.addEventListener('dragover', this.handleDragOver.bind(this));
        dropArea.addEventListener('drop', this.handleDrop.bind(this));
        dropArea.addEventListener('dragenter', this.handleDragEnter.bind(this));
        dropArea.addEventListener('dragleave', this.handleDragLeave.bind(this));

        // Analyze button
        document.getElementById('analyze-btn').addEventListener('click', this.analyzeTransaction.bind(this));

        // Tab navigation
        this.setupTabNavigation();
    }

    setupTabNavigation() {
        // Add click listeners to existing tabs
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('tab-btn')) {
                const tabName = e.target.getAttribute('data-tab');
                this.switchToTab(tabName);
            }
        });
    }

    createAnalysisTabs() {
        const tabNav = document.getElementById('tab-nav');

        // Clear existing analysis tabs (keep only Load Files tab)
        const existingTabs = tabNav.querySelectorAll('.tab-btn');
        existingTabs.forEach(tab => {
            if (tab.getAttribute('data-tab') !== 'load') {
                tab.remove();
            }
        });

        // Create new tabs for analysis results
        const tabs = [
            { id: 'overview', label: 'Overview' },
            { id: 'objects', label: 'Objects Touched' },
            { id: 'changes', label: 'Object Changes' },
            { id: 'gas', label: 'Gas Analysis' },
            { id: 'rawjson', label: 'Raw Json' }
        ];

        tabs.forEach(tab => {
            const tabBtn = document.createElement('button');
            tabBtn.className = 'tab-btn';
            tabBtn.setAttribute('data-tab', tab.id);
            tabBtn.textContent = tab.label;
            tabNav.appendChild(tabBtn);
        });
    }

    switchToTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        const targetBtn = document.querySelector(`[data-tab="${tabName}"]`);
        if (targetBtn) {
            targetBtn.classList.add('active');
        }

        // Update tab panels
        document.querySelectorAll('.tab-panel').forEach(panel => {
            panel.classList.remove('active');
        });

        const targetPanel = document.getElementById(`tab-${tabName}`);
        if (targetPanel) {
            targetPanel.classList.add('active');
        }
    }

    handleDirectorySelect(fileList) {
        const files = Array.from(fileList);
        this.processDirectoryFiles(files);
    }

    processDirectoryFiles(files) {
        // Reset files
        this.files = {
            'transaction_data': null,
            'transaction_effects': null,
            'transaction_gas_report': null,
            'replay_cache_summary': null
        };

        // Reset status indicators
        this.updateFileStatus();

        // Process each file
        files.forEach(file => {
            if (file.type === 'application/json' || file.name.endsWith('.json')) {
                this.identifyAndLoadFile(file);
            }
        });
    }

    identifyAndLoadFile(file) {
        const fileName = file.name.toLowerCase();
        let fileType = null;

        if (fileName === 'transaction_data.json') {
            fileType = 'transaction_data';
        } else if (fileName === 'transaction_effects.json') {
            fileType = 'transaction_effects';
        } else if (fileName === 'transaction_gas_report.json') {
            fileType = 'transaction_gas_report';
        } else if (fileName === 'replay_cache_summary.json') {
            fileType = 'replay_cache_summary';
        } else if (fileName === 'move_call_info.json') {
            fileType = 'move_call_info';
        }

        if (fileType) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    this.files[fileType] = JSON.parse(e.target.result);
                    this.updateFileStatus();
                    this.updateAnalyzeButton();
                } catch (error) {
                    this.showError(`Error parsing ${fileName}: ${error.message}`);
                }
            };
            reader.readAsText(file);
        }
    }

    updateFileStatus() {
        const statusMap = {
            'transaction_data': 'status-transaction-data',
            'transaction_effects': 'status-transaction-effects',
            'transaction_gas_report': 'status-transaction-gas-report',
            'replay_cache_summary': 'status-replay-cache-summary',
            'move_call_info': 'status-ptb-details'
        };

        Object.keys(statusMap).forEach(fileType => {
            const element = document.getElementById(statusMap[fileType]);
            const fileName = fileType.replace('_', '_') + '.json';

            if (this.files[fileType]) {
                element.textContent = `✅ ${fileName}`;
                element.className = 'found';
            } else {
                element.textContent = `❌ ${fileName}`;
                element.className = 'missing';
            }
        });
    }

    handleDragOver(e) {
        e.preventDefault();
    }

    handleDragEnter(e) {
        e.preventDefault();
        document.getElementById('drag-drop-area').classList.add('drag-over');
    }

    handleDragLeave(e) {
        e.preventDefault();
        document.getElementById('drag-drop-area').classList.remove('drag-over');
    }

    handleDrop(e) {
        e.preventDefault();
        document.getElementById('drag-drop-area').classList.remove('drag-over');

        let files = [];

        // Handle directory drop (if items API available)
        if (e.dataTransfer.items) {
            const items = Array.from(e.dataTransfer.items);
            for (const item of items) {
                if (item.kind === 'file') {
                    const entry = item.webkitGetAsEntry();
                    if (entry && entry.isDirectory) {
                        // This is a directory drop
                        this.handleDirectoryDrop(entry);
                        return;
                    }
                }
            }
        }

        // Handle individual file drops
        files = Array.from(e.dataTransfer.files).filter(f =>
            f.type === 'application/json' || f.name.endsWith('.json')
        );

        if (files.length > 0) {
            this.processDirectoryFiles(files);
        }
    }

    handleDirectoryDrop(directoryEntry) {
        const files = [];

        const readDirectory = (dirEntry) => {
            return new Promise((resolve) => {
                const dirReader = dirEntry.createReader();
                dirReader.readEntries((entries) => {
                    const promises = entries.map(entry => {
                        if (entry.isFile && (entry.name.endsWith('.json'))) {
                            return new Promise((resolveFile) => {
                                entry.file((file) => {
                                    files.push(file);
                                    resolveFile();
                                });
                            });
                        }
                        return Promise.resolve();
                    });

                    Promise.all(promises).then(() => resolve());
                });
            });
        };

        readDirectory(directoryEntry).then(() => {
            this.processDirectoryFiles(files);
        });
    }

    updateAnalyzeButton() {
        const allFilesLoaded = Object.values(this.files).every(file => file !== null);
        document.getElementById('analyze-btn').disabled = !allFilesLoaded;
    }

    // Analysis functions ported from Python (keeping all the same logic)

    extractObjectsFromTransactionData(data) {
        const objects = new Set();

        const v1Data = data.V1 || {};
        const ptb = v1Data.kind?.ProgrammableTransaction || {};
        const inputs = ptb.inputs || [];

        // Extract from inputs
        inputs.forEach(inputObj => {
            if (inputObj.Object) {
                if (inputObj.Object.SharedObject) {
                    objects.add(inputObj.Object.SharedObject.id);
                } else if (inputObj.Object.ImmOrOwnedObject) {
                    objects.add(inputObj.Object.ImmOrOwnedObject[0]);
                }
            }
        });

        // Extract from gas payment
        const gasData = v1Data.gas_data || {};
        const payment = gasData.payment || [];
        payment.forEach(paymentObj => {
            objects.add(paymentObj[0]);
        });

        // Extract from commands
        const commands = ptb.commands || [];
        commands.forEach(command => {
            if (command.MoveCall) {
                objects.add(command.MoveCall.package);
            }
        });

        return objects;
    }

    extractGasPaymentObjects(data) {
        const gasObjects = new Set();
        const v1Data = data.V1 || {};
        const gasData = v1Data.gas_data || {};
        const payment = gasData.payment || [];

        payment.forEach(paymentObj => {
            gasObjects.add(paymentObj[0]);
        });

        return gasObjects;
    }

    extractObjectsFromTransactionEffects(data) {
        const objects = new Set();
        const v2Data = data.V2 || {};

        // Changed objects
        const changedObjects = v2Data.changed_objects || [];
        changedObjects.forEach(([objId, _]) => {
            objects.add(objId);
        });

        // Unchanged consensus objects
        const unchangedObjects = v2Data.unchanged_consensus_objects || [];
        unchangedObjects.forEach(([objId, _]) => {
            objects.add(objId);
        });

        return objects;
    }

    analyzeChangedObjectsByOperation(data) {
        const operations = { Created: [], Deleted: [], None: [] };
        const v2Data = data.V2 || {};
        const changedObjects = v2Data.changed_objects || [];

        changedObjects.forEach(([objId, objChange]) => {
            const operation = objChange.id_operation || 'None';
            if (operation === 'Created') {
                operations.Created.push(objId);
            } else if (operation === 'Deleted') {
                operations.Deleted.push(objId);
            } else {
                operations.None.push(objId);
            }
        });

        return operations;
    }

    extractObjectsFromCacheSummary(data) {
        const objects = new Set();
        const cacheEntries = data.cache_entries || [];

        cacheEntries.forEach(entry => {
            objects.add(entry.object_id);
        });

        return objects;
    }

    analyzeCacheByType(data) {
        const cacheAnalysis = { packages: [], objects: [] };
        const cacheEntries = data.cache_entries || [];

        cacheEntries.forEach(entry => {
            if (entry.object_type.Package) {
                cacheAnalysis.packages.push(entry);
            } else {
                cacheAnalysis.objects.push(entry);
            }
        });

        return cacheAnalysis;
    }

    getObjectTypeFromCache(objId, cacheData) {
        const cacheEntries = cacheData.cache_entries || [];

        for (const entry of cacheEntries) {
            if (entry.object_id === objId) {
                if (entry.object_type.Package) {
                    const pkgInfo = entry.object_type.Package;
                    return `Package (${pkgInfo.module_names.length} modules)`;
                } else if (entry.object_type.MoveObject) {
                    const moveObj = entry.object_type.MoveObject;
                    let typeName = `${moveObj.module}::${moveObj.name}`;

                    // Add type arguments if present
                    if (moveObj.type_args && moveObj.type_args.length > 0) {
                        const formattedTypeArgs = moveObj.type_args.map(typeArg => this.formatTypeInput(typeArg)).join(', ');
                        const cleanTypeArgs = formattedTypeArgs.replace(/<[^>]*>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
                        typeName += `<${cleanTypeArgs}>`;
                    }

                    return typeName;
                } else {
                    return "Unknown";
                }
            }
        }
        return "Not in cache";
    }

    getEnhancedObjectTypeFromCache(objId, cacheData) {
        const cacheEntries = cacheData.cache_entries || [];

        for (const entry of cacheEntries) {
            if (entry.object_id === objId) {
                if (entry.object_type.Package) {
                    const pkgInfo = entry.object_type.Package;
                    return `Package (${pkgInfo.module_names.length} modules)`;
                } else if (entry.object_type.MoveObject) {
                    const moveObj = entry.object_type.MoveObject;
                    // Include package address in the type information
                    let typeName = `${moveObj.address}::${moveObj.module}::${moveObj.name}`;

                    // Add type arguments if present
                    if (moveObj.type_args && moveObj.type_args.length > 0) {
                        const formattedTypeArgs = moveObj.type_args.map(typeArg => this.formatTypeInput(typeArg)).join(', ');
                        const cleanTypeArgs = formattedTypeArgs.replace(/<[^>]*>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
                        typeName += `<${cleanTypeArgs}>`;
                    }

                    return typeName;
                } else {
                    return "Unknown";
                }
            }
        }
        return "Not in cache";
    }

    getObjectTypeWithHover(objId, cacheData) {
        const cacheEntries = cacheData.cache_entries || [];

        for (const entry of cacheEntries) {
            if (entry.object_id === objId) {
                if (entry.object_type.Package) {
                    return `MovePackage`;
                } else if (entry.object_type.MoveObject) {
                    const moveObj = entry.object_type.MoveObject;

                    // Show module::name with generics
                    let typeName = `${moveObj.module}::${moveObj.name}`;
                    let fullTypeName = `${moveObj.address}::${moveObj.module}::${moveObj.name}`;

                    // Add type arguments if present
                    if (moveObj.type_args && moveObj.type_args.length > 0) {
                        const formattedTypeArgs = moveObj.type_args.map(typeArg => this.formatTypeInput(typeArg)).join(', ');
                        // Remove HTML tags for display
                        const cleanTypeArgs = formattedTypeArgs.replace(/<[^>]*>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
                        typeName += `<${cleanTypeArgs}>`;
                        fullTypeName += `<${cleanTypeArgs}>`;
                    }

                    // Show package address with full type on hover
                    return `<span title="${fullTypeName}">${typeName}</span>`;
                } else {
                    return "Unknown";
                }
            }
        }
        return "Not in cache";
    }

    getObjectUsage(objId, txDataObjects, txEffectsObjects, gasPaymentObjects) {
        const usage = [];
        if (gasPaymentObjects.has(objId)) {
            usage.push('gas');
        } else if (txDataObjects.has(objId)) {
            usage.push('input');
        } else if (txEffectsObjects.has(objId)) {
            usage.push('runtime');
        }
        return usage;
    }

    getShortObjectTypeFromCache(objId, cacheDataOrTransaction) {
        // Support both old cacheData format and new Transaction object
        const cacheEntries = cacheDataOrTransaction.cache_entries || cacheDataOrTransaction._objects || [];

        for (const entry of cacheEntries) {
            if (entry.object_id === objId) {
                if (entry.object_type.Package) {
                    return `MovePackage`;
                } else if (entry.object_type.MoveObject) {
                    const moveObj = entry.object_type.MoveObject;
                    let typeName = `${moveObj.module}::${moveObj.name}`;

                    // Add type arguments if present
                    if (moveObj.type_args && moveObj.type_args.length > 0) {
                        const formattedTypeArgs = moveObj.type_args.map(typeArg => this.formatTypeInput(typeArg)).join(', ');
                        typeName += `&lt;${formattedTypeArgs}&gt;`;
                    }

                    return typeName;
                } else {
                    return "Unknown";
                }
            }
        }
        return "Not in cache";
    }

    createTypeWithTooltip(objId, cacheDataOrTransaction, maxLength = null) {
        try {
            // Support both old cacheData format and new Transaction object
            const cacheEntries = cacheDataOrTransaction.cache_entries || cacheDataOrTransaction._objects || [];

            for (const entry of cacheEntries) {
                if (entry.object_id === objId) {
                    if (entry.object_type.Package) {
                        // For packages, display as MovePackage primitive type
                        return `MovePackage`;
                    } else if (entry.object_type.MoveObject) {
                        // Use unified formatter for consistent display
                        return this.formatTypeUnified(entry.object_type.MoveObject, cacheDataOrTransaction, maxLength);
                    } else {
                        return "Unknown";
                    }
                }
            }
            return "Not in cache";
        } catch (error) {
            // Fallback to short type
            return this.getShortObjectTypeFromCache(objId, cacheDataOrTransaction);
        }
    }

    /**
     * Format argument with object ID for command display
     * Shows Input_N(objectId): Type for object inputs
     */
    formatArgumentWithObjectId(argument, inputs, transaction, maxLength = 100, extraIndent = 8, baseIndent = 0) {
        if (argument.Input !== undefined) {
            const inputIndex = argument.Input;
            if (inputs && inputs[inputIndex] && inputs[inputIndex].Object) {
                const input = inputs[inputIndex];
                let objectId = null;

                if (input.Object.ImmOrOwnedObject) {
                    objectId = input.Object.ImmOrOwnedObject[0];
                } else if (input.Object.SharedObject) {
                    objectId = input.Object.SharedObject.id;
                } else if (input.Object.Receiving) {
                    objectId = input.Object.Receiving[0];
                }

                if (objectId) {
                    const typeWithTooltip = this.createTypeWithTooltip(objectId, transaction, 50);
                    const objectIdLink = this.createExplorerLink(objectId, 'object');
                    return this.formatArgumentWithType(`Input_${inputIndex}(${objectIdLink})`, typeWithTooltip, maxLength, extraIndent, baseIndent);
                }
            }
        }

        // Fall back to regular formatting for non-object inputs
        return this.formatArgument(argument, inputs, transaction);
    }

    formatArgument(argument, inputs, cacheData) {
        // Handle case where argument is just the string "GasCoin"
        if (argument === "GasCoin") {
            // GasCoin is always 0x2::coin::Coin<0x2::sui::SUI>
            const gasCoinType = this.createHoverForType('0x0000000000000000000000000000000000000000000000000000000000000002::coin::Coin<0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI>');
            return gasCoinType;
        } else if (argument.GasCoin !== undefined) {
            // GasCoin is always 0x2::coin::Coin<0x2::sui::SUI>
            const gasCoinType = this.createHoverForType('0x0000000000000000000000000000000000000000000000000000000000000002::coin::Coin<0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI>');
            return gasCoinType;
        } else if (argument.Input !== undefined) {
            const inputIndex = argument.Input;

            // Get the type of the input if it's an object
            if (inputs && inputs[inputIndex] && inputs[inputIndex].Object) {
                const input = inputs[inputIndex];
                let objectId = null;

                if (input.Object.ImmOrOwnedObject) {
                    objectId = input.Object.ImmOrOwnedObject[0];
                } else if (input.Object.SharedObject) {
                    objectId = input.Object.SharedObject.id;
                } else if (input.Object.Receiving) {
                    objectId = input.Object.Receiving[0];
                }

                if (objectId) {
                    const typeWithTooltip = this.createTypeWithTooltip(objectId, cacheData, 50);
                    return `Input_${inputIndex}: ${typeWithTooltip}`;
                }
            }

            // Fall back to just the input reference if no type available
            return `Input_${inputIndex}`;
        } else if (argument.Result !== undefined) {
            const cmdIndex = argument.Result;
            const inferredType = this.inferCommandReturnType(cmdIndex);
            if (inferredType && inferredType !== 'unknown' && inferredType !== 'void') {
                const typeWithHover = this.createHoverForType(inferredType, cacheData);
                return `Cmd_${cmdIndex}: ${typeWithHover}`;
            }
            return `Cmd_${cmdIndex}`;
        } else if (argument.NestedResult !== undefined) {
            const [cmdIndex, resultIndex] = argument.NestedResult;
            const inferredType = this.inferCommandReturnType(cmdIndex, resultIndex);
            if (inferredType && inferredType !== 'unknown' && inferredType !== 'void') {
                const typeWithHover = this.createHoverForType(inferredType, cacheData);
                return `Cmd_${cmdIndex}.${resultIndex}: ${typeWithHover}`;
            }
            return `Cmd_${cmdIndex}.${resultIndex}`;
        } else {
            return JSON.stringify(argument);
        }
    }

    formatTypeInput(typeInput) {
        if (typeof typeInput === 'string') {
            // Handle primitive types as strings
            const primitiveMap = {
                'Bool': 'bool',
                'U8': 'u8',
                'U16': 'u16',
                'U32': 'u32',
                'U64': 'u64',
                'U128': 'u128',
                'U256': 'u256',
                'Address': 'address',
                'Signer': 'Signer'
            };
            return primitiveMap[typeInput] || typeInput.toLowerCase();
        }

        // Handle the JSON object format: {"struct": {"address": "...", "module": "...", "name": "...", "type_args": []}}
        if (typeInput.struct) {
            const structInput = typeInput.struct;
            let shortType = `${structInput.module}::${structInput.name}`;
            const packageId = structInput.address.startsWith('0x') ? structInput.address : `0x${structInput.address}`;
            let fullType = `${packageId}::${structInput.module}::${structInput.name}`;

            // Handle type arguments for generic structs
            if (structInput.type_args && structInput.type_args.length > 0) {
                const formattedTypeArgs = structInput.type_args.map(arg => this.formatTypeInput(arg)).join(', ');
                shortType += `&lt;${formattedTypeArgs}&gt;`;

                // For tooltip, strip HTML but keep proper formatting
                const plainTypeArgs = structInput.type_args.map(arg => {
                    const formatted = this.formatTypeInput(arg);
                    return formatted.replace(/<[^>]*>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
                }).join(', ');
                fullType += `<${plainTypeArgs}>`;
            }

            return shortType; // Don't wrap in span here, let the caller handle it
        }

        // Handle JSON vector format: {"vector": "u8"} or {"vector": {...}}
        if (typeInput.vector !== undefined) {
            const innerType = this.formatTypeInput(typeInput.vector);
            return `vector&lt;${innerType}&gt;`;
        }

        if (typeInput.Bool !== undefined) return 'bool';
        if (typeInput.U8 !== undefined) return 'u8';
        if (typeInput.U16 !== undefined) return 'u16';
        if (typeInput.U32 !== undefined) return 'u32';
        if (typeInput.U64 !== undefined) return 'u64';
        if (typeInput.U128 !== undefined) return 'u128';
        if (typeInput.U256 !== undefined) return 'u256';
        if (typeInput.Address !== undefined) return 'address';
        if (typeInput.Signer !== undefined) return 'Signer';

        if (typeInput.Vector !== undefined) {
            const innerType = this.formatTypeInput(typeInput.Vector);
            return `vector&lt;${innerType}&gt;`;
        }

        if (typeInput.Struct !== undefined) {
            const structInput = typeInput.Struct;
            let shortType = `${structInput.module}::${structInput.name}`;
            const packageId = structInput.address.startsWith('0x') ? structInput.address : `0x${structInput.address}`;
            let fullType = `${packageId}::${structInput.module}::${structInput.name}`;

            // Handle type arguments for generic structs
            if (structInput.type_args && structInput.type_args.length > 0) {
                const formattedTypeArgs = structInput.type_args.map(arg => this.formatTypeInput(arg)).join(', ');
                shortType += `&lt;${formattedTypeArgs}&gt;`;

                // For tooltip, strip HTML but keep proper formatting
                const plainTypeArgs = structInput.type_args.map(arg => {
                    const formatted = this.formatTypeInput(arg);
                    return formatted.replace(/<[^>]*>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
                }).join(', ');
                fullType += `<${plainTypeArgs}>`;
            }

            return shortType; // Don't wrap in span here, let the caller handle it
        }

        return JSON.stringify(typeInput);
    }

    /**
     * Format an argument with its type, wrapping after ':' if too long
     * @param {string} argName - The argument name (e.g., "Input_0(0xabc...)")
     * @param {string} typeHTML - The type HTML (may contain tooltips)
     * @param {number} maxLength - Maximum length before wrapping (default 100)
     * @param {number} extraIndent - Extra indentation spaces when wrapped (default 4)
     * @param {number} baseIndent - Base indentation level of this line (default 0)
     * @returns {string} Formatted argument with optional wrapping
     */
    formatArgumentWithType(argName, typeHTML, maxLength = 100, extraIndent = 4, baseIndent = 0) {
        // Estimate length without HTML tags - use DOM parsing for accuracy
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = argName;
        const plainArgName = tempDiv.textContent || tempDiv.innerText || '';

        tempDiv.innerHTML = typeHTML;
        const plainType = tempDiv.textContent || tempDiv.innerText || '';

        // Total length includes base indentation + argument name + ": " + type
        const totalLength = baseIndent + plainArgName.length + 2 + plainType.length; // +2 for ": "

        if (totalLength > maxLength) {
            // Wrap after colon with indentation
            // Use nbsp for reliable indentation in table cells
            const spaces = '&nbsp;'.repeat(extraIndent);
            return `${argName}:<br>${spaces}${typeHTML}`;
        } else {
            // Keep on same line
            return `${argName}: ${typeHTML}`;
        }
    }

    formatMoveFunction(packageId, module, functionName, typeArguments, maxLength = null) {
        // Build display name (without package): module::function
        let displayName = `${module}::${functionName}`;

        // Build full qualified name (with package): package::module::function
        const fullPackage = packageId.startsWith('0x') ? packageId : `0x${packageId}`;
        let fullQualifiedName = `${fullPackage}::${module}::${functionName}`;

        // Add type arguments if present
        if (typeArguments && typeArguments.length > 0) {
            // Parse type arguments into MoveType objects
            const moveTypeArgs = typeArguments.map(typeArg => MoveType.fromTypeStructure(typeArg, null));

            // Format type arguments for display using MoveType.toHTML()
            const formattedTypeArgs = moveTypeArgs.map(t => t.toHTML());

            // Build full qualified type arguments for function tooltip
            const fullTypeArgs = moveTypeArgs.map(t => t.toFullyQualifiedString()).join(', ');

            fullQualifiedName += `<${fullTypeArgs}>`;

            // Check if we should wrap type arguments
            const typeArgsString = formattedTypeArgs.join(', ');
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = typeArgsString;
            const plainTypeArgs = tempDiv.textContent || tempDiv.innerText || '';
            const estimatedLength = displayName.length + plainTypeArgs.length + 2;

            if (maxLength && estimatedLength > maxLength) {
                // Wrap: break at first < and indent type arguments
                // Wrap each type argument in a span with left margin for indentation
                displayName += '&lt;<br>';
                for (let i = 0; i < formattedTypeArgs.length; i++) {
                    displayName += `<span style="display: inline-block; margin-left: 32px;">${formattedTypeArgs[i]}</span>,<br>`;
                }
                displayName += '&gt;';
            } else {
                // Inline: all on one line
                displayName += '&lt;' + formattedTypeArgs.join(', ') + '&gt;';
            }
        }

        // Wrap display name with tooltip showing full qualified name
        return `<span class="custom-tooltip" data-tooltip="${fullQualifiedName}" style="cursor: help; text-decoration: underline dotted; color: #87ceeb;">${displayName}</span>`;
    }

    formatCommandDetails(commandDetails, maxLength = 100, baseIndent = 25) {
        // Check if the command details are too long
        const plainText = commandDetails.replace(/<[^>]*>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>');

        if (plainText.length <= maxLength) {
            return commandDetails;
        }

        // Check if it's a function call pattern: functionName(args...)
        const functionMatch = commandDetails.match(/^(.*?)\((.*)\)$/);
        if (functionMatch) {
            // Handle function call pattern
            return this.formatFunctionCall(functionMatch, baseIndent);
        }

        // Check if it's a SplitCoins/MergeCoins pattern: "arg1, amounts: [...]" or "arg1, sources: [...]"
        const splitCoinsMatch = commandDetails.match(/^(.*?), (amounts|sources): \[(.*)\]$/);
        if (splitCoinsMatch) {
            return this.formatSplitCoinsPattern(splitCoinsMatch, baseIndent);
        }

        // Check if it's a general comma-separated pattern with multiple arguments
        if (commandDetails.includes(',')) {
            return this.formatCommaSeparatedArgs(commandDetails, baseIndent);
        }

        return commandDetails; // Return as-is if no pattern matches
    }

    formatFunctionCall(functionMatch, baseIndent) {
        const [, functionPart, argsPart] = functionMatch;

        // Split arguments by comma, but be careful about nested structures and generics
        const args = [];
        let currentArg = '';
        let depth = 0;
        let inTag = false;
        let inQuote = false; // Track if we're inside a quoted attribute value
        let quoteChar = null; // Track which quote character we're in (' or ")
        let inGenerics = 0; // Track generic bracket depth

        for (let i = 0; i < argsPart.length; i++) {
            const char = argsPart[i];

            // Track quotes (both inside and outside tags - attributes can have quotes)
            if (char === '"' || char === "'") {
                if (!inQuote) {
                    inQuote = true;
                    quoteChar = char;
                } else if (char === quoteChar) {
                    inQuote = false;
                    quoteChar = null;
                }
            }

            // Check for HTML-encoded generic brackets (only when not in quotes)
            if (!inQuote && argsPart.substring(i, i + 4) === '&lt;') {
                inGenerics++;
                currentArg += argsPart.substring(i, i + 4);
                i += 3; // Skip the next 3 characters since we've processed &lt;
                continue;
            } else if (!inQuote && argsPart.substring(i, i + 4) === '&gt;') {
                inGenerics--;
                currentArg += argsPart.substring(i, i + 4);
                i += 3; // Skip the next 3 characters since we've processed &gt;
                continue;
            }

            // Handle HTML tags (when not in quotes)
            // inTag tracks if we're inside a tag definition: <span ...>
            // After seeing >, we exit inTag, but we're now in the tag's CONTENT until we see </
            if (!inQuote && char === '<') {
                if (argsPart[i + 1] === '/') {
                    // Closing tag like </span> - we're exiting tag content
                    inTag = false;
                } else {
                    // Opening tag like <span> - we're entering tag definition
                    inTag = true;
                }
            } else if (!inQuote && char === '>' && inTag) {
                // We just closed the tag definition, now we're in tag content
                // Keep inTag = true to skip depth tracking in content
                // inTag will be set to false when we see </
            }

            // Track depth (parentheses and brackets) - but not inside quotes, tags, or when they're part of HTML/generics
            // We need to exclude inTag because content inside tags (like the visible "[52, 99, ...]") shouldn't affect depth
            if (!inQuote && !inTag && inGenerics === 0) {
                if (char === '[' || char === '(') depth++;
                if (char === ']' || char === ')') depth--;
            }

            // Only split on comma if we're at the top level of all structures and not in quotes
            if (char === ',' && depth === 0 && !inQuote && inGenerics === 0) {
                args.push(currentArg.trim());
                currentArg = '';
            } else {
                currentArg += char;
            }
        }

        if (currentArg.trim()) {
            args.push(currentArg.trim());
        }

        // Format with line breaks only if too long
        const oneLine = `${functionPart}(${argsPart})`;

        // Use DOM parsing to get accurate plain text length
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = oneLine;
        const plainOneLine = tempDiv.textContent || tempDiv.innerText || '';

        // Only break into multiple lines if the single line would be too long
        if (args.length > 1 && plainOneLine.length > 120) {
            // Use a reasonable fixed indentation (baseIndent + 4 spaces)
            const argIndent = ' '.repeat(baseIndent + 4);
            const formattedArgs = args.map(arg => `${argIndent}${arg}`).join(',\n');
            return `${functionPart}(\n${formattedArgs}\n${' '.repeat(baseIndent)})`;
        }

        return oneLine;
    }

    formatSplitCoinsPattern(splitCoinsMatch, baseIndent) {
        const [, firstArg, arrayType, arrayContents] = splitCoinsMatch;

        // Split the array contents by comma
        const arrayArgs = this.splitByComma(arrayContents);

        if (arrayArgs.length > 2) {
            // Both arguments should align at the same level where the first argument starts
            // The first argument starts right after the command type, so wrapped arguments
            // should align to the same column position
            const argIndent = ' '.repeat(baseIndent); // Align with where first argument starts
            const arrayContentIndent = ' '.repeat(baseIndent + 4); // Extra indentation for array contents
            const formattedArrayArgs = arrayArgs.map(arg => `${arrayContentIndent}${arg.trim()}`).join(',\n');
            return `${firstArg},\n${argIndent}${arrayType}: [\n${formattedArrayArgs}\n${argIndent}]`;
        }

        return `${firstArg}, ${arrayType}: [${arrayContents}]`;
    }

    formatCommaSeparatedArgs(commandDetails, baseIndent) {
        const args = this.splitByComma(commandDetails);

        if (args.length > 2) {
            const argIndent = ' '.repeat(baseIndent + 4);
            const formattedArgs = args.map(arg => `${argIndent}${arg.trim()}`).join(',\n');
            return `\n${formattedArgs}`;
        }

        return commandDetails;
    }

    splitByComma(text) {
        const args = [];
        let currentArg = '';
        let depth = 0;
        let inTag = false;
        let inGenerics = 0;

        for (let i = 0; i < text.length; i++) {
            const char = text[i];

            // Check for HTML-encoded generic brackets
            if (text.substring(i, i + 4) === '&lt;') {
                inGenerics++;
                currentArg += text.substring(i, i + 4);
                i += 3;
                continue;
            } else if (text.substring(i, i + 4) === '&gt;') {
                inGenerics--;
                currentArg += text.substring(i, i + 4);
                i += 3;
                continue;
            }

            // Handle HTML tags
            if (char === '<' && text[i + 1] !== '/') {
                inTag = true;
            } else if (char === '>' && inTag) {
                inTag = false;
            }

            if (!inTag && inGenerics === 0) {
                if (char === '[' || char === '(') depth++;
                if (char === ']' || char === ')') depth--;
            }

            // Only split on comma if we're at the top level
            if (char === ',' && depth === 0 && !inTag && inGenerics === 0) {
                args.push(currentArg.trim());
                currentArg = '';
            } else {
                currentArg += char;
            }
        }

        if (currentArg.trim()) {
            args.push(currentArg.trim());
        }

        return args;
    }

    inferTypeFromArgument(argument, inputs, cacheData) {
        // Handle GasCoin
        if (argument === "GasCoin" || (argument.GasCoin !== undefined)) {
            return 'coin::Coin<sui::SUI>';
        }

        // Handle Input references
        if (argument.Input !== undefined) {
            const inputIndex = argument.Input;
            if (inputs && inputs[inputIndex]) {
                const input = inputs[inputIndex];

                if (input.Object) {
                    let objectId = null;
                    if (input.Object.ImmOrOwnedObject) {
                        objectId = input.Object.ImmOrOwnedObject[0];
                    } else if (input.Object.SharedObject) {
                        objectId = input.Object.SharedObject.id;
                    } else if (input.Object.Receiving) {
                        objectId = input.Object.Receiving[0];
                    }

                    if (objectId) {
                        const objectType = this.getShortObjectTypeFromCache(objectId, cacheData);
                        if (objectType && objectType !== 'Not in cache') {
                            return objectType;
                        }
                    }
                } else if (input.Pure) {
                    // For Pure arguments, use enhanced type inference
                    const pureData = input.Pure;
                    if (Array.isArray(pureData)) {
                        const inferredType = this.inferPureValueType(pureData, 'general');
                        if (inferredType) {
                            return inferredType;
                        }
                        return 'vector<u8>'; // Default for unknown byte arrays
                    }
                }
            }
        }

        // Handle Result references - try to find what command produced this result
        if (argument.Result !== undefined) {
            const cmdIndex = argument.Result;
            // Try to infer the return type based on the producing command
            return this.inferCommandReturnType(cmdIndex);
        }

        // Handle NestedResult references - Cmd_X.Y format
        if (argument.NestedResult !== undefined) {
            const [cmdIndex, resultIndex] = argument.NestedResult;
            return this.inferCommandReturnType(cmdIndex, resultIndex);
        }

        return 'unknown';
    }

    bytesToU64(bytes) {
        // Convert little-endian u64 bytes to BigInt for safe handling of large numbers
        let result = 0n;
        for (let i = 0; i < Math.min(8, bytes.length); i++) {
            result += BigInt(bytes[i]) << (BigInt(i) * 8n);
        }
        return result;
    }

    convertPureValue(bytes, typeInput) {
        // Convert pure bytes to typed value based on TypeInput
        if (!Array.isArray(bytes) || bytes.length === 0) {
            return null;
        }

        // Handle primitive types
        if (typeof typeInput === 'string') {
            return this.convertPrimitiveType(bytes, typeInput);
        }

        // Handle structured TypeInput objects
        if (typeof typeInput === 'object' && typeInput !== null) {
            // Check for Option type (0x1::option::Option<T>)
            if (this.isOptionType(typeInput)) {
                return this.convertOption(bytes, typeInput);
            }

            // Check for vector type
            if (typeInput.vector !== undefined || typeInput.Vector !== undefined) {
                const elementTypeInput = typeInput.vector || typeInput.Vector;
                // Extract element type - could be a string or object
                const elementType = this.extractElementType(elementTypeInput);
                if (elementType) {
                    return this.convertVector(bytes, elementType);
                }
            }
            // Check for primitive type keys
            if (typeInput.bool !== undefined || typeInput.Bool !== undefined) {
                return this.convertBool(bytes);
            } else if (typeInput.u8 !== undefined || typeInput.U8 !== undefined) {
                return this.convertU8(bytes);
            } else if (typeInput.u16 !== undefined || typeInput.U16 !== undefined) {
                return this.convertU16(bytes);
            } else if (typeInput.u32 !== undefined || typeInput.U32 !== undefined) {
                return this.convertU32(bytes);
            } else if (typeInput.u64 !== undefined || typeInput.U64 !== undefined) {
                return this.convertU64(bytes);
            } else if (typeInput.u128 !== undefined || typeInput.U128 !== undefined) {
                return this.convertU128(bytes);
            } else if (typeInput.u256 !== undefined || typeInput.U256 !== undefined) {
                return this.convertU256(bytes);
            } else if (typeInput.address !== undefined || typeInput.Address !== undefined) {
                return this.convertAddress(bytes);
            }
        }

        return null; // Unsupported type
    }

    /**
     * Check if a type is Option<T> from 0x1::option::Option
     */
    isOptionType(typeInput) {
        // Check for Datatype format: [address, module, name, typeParams]
        if (typeInput.Datatype) {
            const [address, module, name, _] = typeInput.Datatype;
            const normalizedAddr = this.normalizeAddress(address);
            return normalizedAddr === '0x1' && module === 'option' && name === 'Option';
        }

        // Check for DatatypeInstantiation format: [[address, module, name, typeParams], typeArgs]
        if (typeInput.DatatypeInstantiation) {
            const [[address, module, name, _], typeArgs] = typeInput.DatatypeInstantiation;
            const normalizedAddr = this.normalizeAddress(address);
            return normalizedAddr === '0x1' && module === 'option' && name === 'Option';
        }

        return false;
    }

    /**
     * Normalize an address to 0x-prefixed format with leading zeros removed
     */
    normalizeAddress(address) {
        // Remove 0x prefix if present
        let addr = address.startsWith('0x') ? address.slice(2) : address;
        // Remove leading zeros
        addr = addr.replace(/^0+/, '') || '0';
        // Add 0x prefix
        return '0x' + addr;
    }

    /**
     * Convert Option<T> bytes to "None" or "Some(value)"
     */
    convertOption(bytes, typeInput) {
        if (bytes.length === 0) {
            return 'None';
        }

        const discriminant = bytes[0];

        if (discriminant === 0) {
            return 'None';
        } else if (discriminant === 1) {
            // Extract the inner type
            let innerType = null;

            if (typeInput.DatatypeInstantiation) {
                const [[_, __, ___, ____], typeArgs] = typeInput.DatatypeInstantiation;
                if (typeArgs && typeArgs.length > 0) {
                    innerType = typeArgs[0];
                }
            } else if (typeInput.Datatype) {
                const [_, __, ___, typeParams] = typeInput.Datatype;
                if (typeParams && typeParams.length > 0) {
                    innerType = typeParams[0];
                }
            }

            if (!innerType) {
                // If we can't determine the inner type, just show the hex
                const innerBytes = bytes.slice(1);
                const hex = innerBytes.map(b => b.toString(16).padStart(2, '0')).join('');
                return `Some(0x${hex})`;
            }

            // Decode the inner value
            const innerBytes = bytes.slice(1);
            const innerValue = this.convertPureValue(innerBytes, innerType);

            if (innerValue !== null) {
                return `Some(${innerValue})`;
            } else {
                // Fallback to hex if we can't decode
                const hex = innerBytes.map(b => b.toString(16).padStart(2, '0')).join('');
                return `Some(0x${hex})`;
            }
        } else {
            // Invalid discriminant
            return 'Invalid Option';
        }
    }

    extractElementType(elementTypeInput) {
        // Extract element type name from various input formats
        if (typeof elementTypeInput === 'string') {
            return elementTypeInput;
        }
        if (typeof elementTypeInput === 'object' && elementTypeInput !== null) {
            // Check for primitive type keys
            if (elementTypeInput.u8 !== undefined || elementTypeInput.U8 !== undefined) return 'u8';
            if (elementTypeInput.u16 !== undefined || elementTypeInput.U16 !== undefined) return 'u16';
            if (elementTypeInput.u32 !== undefined || elementTypeInput.U32 !== undefined) return 'u32';
            if (elementTypeInput.u64 !== undefined || elementTypeInput.U64 !== undefined) return 'u64';
            if (elementTypeInput.u128 !== undefined || elementTypeInput.U128 !== undefined) return 'u128';
            if (elementTypeInput.u256 !== undefined || elementTypeInput.U256 !== undefined) return 'u256';
            if (elementTypeInput.bool !== undefined || elementTypeInput.Bool !== undefined) return 'bool';
            if (elementTypeInput.address !== undefined || elementTypeInput.Address !== undefined) return 'address';
        }
        return null;
    }

    convertPrimitiveType(bytes, typeName) {
        // Handle string-based type names
        switch (typeName.toLowerCase()) {
            case 'bool':
                return this.convertBool(bytes);
            case 'u8':
                return this.convertU8(bytes);
            case 'u16':
                return this.convertU16(bytes);
            case 'u32':
                return this.convertU32(bytes);
            case 'u64':
                return this.convertU64(bytes);
            case 'u128':
                return this.convertU128(bytes);
            case 'u256':
                return this.convertU256(bytes);
            case 'address':
                return this.convertAddress(bytes);
            default:
                return null;
        }
    }

    convertBool(bytes) {
        // 1 byte; zero means false, non-zero means true
        if (bytes.length < 1) return null;
        return bytes[0] !== 0;
    }

    convertU8(bytes) {
        // 1 byte representing unsigned 8-bit integer
        if (bytes.length < 1) return null;
        return bytes[0];
    }

    convertU16(bytes) {
        // 2 bytes, little-endian
        if (bytes.length < 2) return null;
        return bytes[0] | (bytes[1] << 8);
    }

    convertU32(bytes) {
        // 4 bytes, little-endian
        if (bytes.length < 4) return null;
        return (bytes[0] | (bytes[1] << 8) | (bytes[2] << 16) | (bytes[3] << 24)) >>> 0;
    }

    convertU64(bytes) {
        // 8 bytes, little-endian - use existing implementation
        if (bytes.length < 8) return null;
        return this.bytesToU64(bytes);
    }

    convertU128(bytes) {
        // 16 bytes, little-endian
        if (bytes.length < 16) return null;
        let result = 0n;
        for (let i = 0; i < 16; i++) {
            result += BigInt(bytes[i]) << (BigInt(i) * 8n);
        }
        return result;
    }

    convertU256(bytes) {
        // 32 bytes, little-endian
        if (bytes.length < 32) return null;
        let result = 0n;
        for (let i = 0; i < 32; i++) {
            result += BigInt(bytes[i]) << (BigInt(i) * 8n);
        }
        return result;
    }

    convertAddress(bytes) {
        // Address stored in standard address format (32 bytes)
        if (bytes.length < 32) return null;
        // Convert to hex string with 0x prefix
        const hex = bytes.map(b => b.toString(16).padStart(2, '0')).join('');
        return `0x${hex}`;
    }

    readUleb128(bytes, offset = 0) {
        // Read a uleb128-encoded integer from byte array
        // Returns { value, bytesRead } where bytesRead is the number of bytes consumed
        // Example: [0x02] -> { value: 2, bytesRead: 1 }
        // Example: [0x80, 0x01] -> { value: 128, bytesRead: 2 }
        let result = 0;
        let shift = 0;
        let byte;
        let position = offset;

        do {
            if (position >= bytes.length) {
                return null; // Not enough bytes
            }
            byte = bytes[position++];
            result |= (byte & 0x7f) << shift;
            shift += 7;
        } while (byte & 0x80);

        return { value: result, bytesRead: position - offset };
    }

    convertVector(bytes, elementType) {
        // Parse a vector: first value is length in uleb128, followed by elements
        // elementType can be a string like 'u8', 'u64', etc.
        // Example: [0x02, 0x03, 0x04] for vector<u8> with 2 elements [3, 4]
        // Example: [0x02, 0x03, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00] for vector<u64> with 2 elements [3, 4]

        const lengthResult = this.readUleb128(bytes, 0);
        if (!lengthResult) return null;

        const length = lengthResult.value;
        const elements = [];
        let offset = lengthResult.bytesRead;

        // Determine element size based on type
        let elementSize;
        let converter;

        switch (elementType.toLowerCase()) {
            case 'u8':
                elementSize = 1;
                converter = (b) => this.convertU8(b);
                break;
            case 'u16':
                elementSize = 2;
                converter = (b) => this.convertU16(b);
                break;
            case 'u32':
                elementSize = 4;
                converter = (b) => this.convertU32(b);
                break;
            case 'u64':
                elementSize = 8;
                converter = (b) => this.convertU64(b);
                break;
            case 'u128':
                elementSize = 16;
                converter = (b) => this.convertU128(b);
                break;
            case 'u256':
                elementSize = 32;
                converter = (b) => this.convertU256(b);
                break;
            case 'address':
                elementSize = 32;
                converter = (b) => this.convertAddress(b);
                break;
            case 'bool':
                elementSize = 1;
                converter = (b) => this.convertBool(b);
                break;
            default:
                return null; // Unsupported element type
        }

        // Parse each element
        for (let i = 0; i < length; i++) {
            if (offset + elementSize > bytes.length) {
                return null; // Not enough bytes for all elements
            }

            const elementBytes = bytes.slice(offset, offset + elementSize);
            const value = converter(elementBytes);
            if (value === null) return null;

            elements.push(value);
            offset += elementSize;
        }

        return elements;
    }

    formatPureValue(value, typeName) {
        // Format the converted value for display
        if (value === null) return null;

        // Handle arrays (vectors)
        if (Array.isArray(value)) {
            const formattedElements = value.map(elem => {
                // Format each element based on its type
                if (typeof elem === 'bigint') {
                    return this.formatUnsignedInteger(elem);
                } else if (typeof elem === 'string' && elem.startsWith('0x')) {
                    return elem; // Address
                } else {
                    return elem.toString();
                }
            });
            return `[${formattedElements.join(', ')}]`;
        }

        // If typeName is an object (MoveType), extract the type name string
        let typeNameStr = typeName;
        if (typeof typeName === 'object' && typeName !== null) {
            // Check for primitive type keys
            if ('Bool' in typeName) typeNameStr = 'bool';
            else if ('U8' in typeName) typeNameStr = 'u8';
            else if ('U16' in typeName) typeNameStr = 'u16';
            else if ('U32' in typeName) typeNameStr = 'u32';
            else if ('U64' in typeName) typeNameStr = 'u64';
            else if ('U128' in typeName) typeNameStr = 'u128';
            else if ('U256' in typeName) typeNameStr = 'u256';
            else if ('Address' in typeName) typeNameStr = 'address';
            else {
                // For complex types, just return the value as-is
                return value.toString();
            }
        }

        switch (typeNameStr?.toLowerCase()) {
            case 'bool':
                return value.toString();
            case 'u8':
            case 'u16':
            case 'u32':
                return this.formatUnsignedInteger(value);
            case 'u64':
            case 'u128':
            case 'u256':
                return this.formatUnsignedInteger(value);
            case 'address':
                return value;
            default:
                return value.toString();
        }
    }

    inferPureValueType(bytes, context = 'amount') {
        // Infer the most likely type from pure bytes based on context
        if (!Array.isArray(bytes)) return null;

        // Context-based inference
        if (context === 'amount' || context === 'value' || context === 'balance') {
            // Amount/value contexts typically use u64
            if (bytes.length === 8) return 'u64';
            if (bytes.length === 16) return 'u128';
            if (bytes.length === 32) return 'u256';
        }

        // General byte length based inference
        switch (bytes.length) {
            case 1:
                // Could be bool or u8 - check if it's 0 or 1 for bool likelihood
                return (bytes[0] === 0 || bytes[0] === 1) ? 'bool' : 'u8';
            case 2:
                return 'u16';
            case 4:
                return 'u32';
            case 8:
                return 'u64';
            case 16:
                return 'u128';
            case 32:
                // Could be u256 or address
                return context === 'address' ? 'address' : 'u256';
            default:
                return null; // Unknown type
        }
    }

    formatPureInput(bytes, context = 'amount', explicitType = null, forceHex = false) {
        // Format pure input with appropriate type conversion and highlighting
        // forceHex: if true, always show as hex (for inputs section)
        // explicitType can be a TypeInput object or string type name

        if (forceHex) {
            // For inputs section - always show as hex byte array
            const fullHex = `0x${bytes.map(b => b.toString(16).padStart(2, '0')).join('')}`;
            return this.truncatePureValue(fullHex);
        }

        // For commands section - convert to proper typed values
        let inferredType = explicitType;

        if (!inferredType) {
            inferredType = this.inferPureValueType(bytes, context);
        }

        if (!inferredType) {
            // Fallback to hex display for unknown types
            const fullHex = `0x${bytes.map(b => b.toString(16).padStart(2, '0')).join('')}`;
            return this.truncatePureValue(fullHex);
        }

        const convertedValue = this.convertPureValue(bytes, inferredType);
        if (convertedValue === null) {
            // Fallback to hex display
            const fullHex = `0x${bytes.map(b => b.toString(16).padStart(2, '0')).join('')}`;
            return this.truncatePureValue(fullHex);
        }

        const formattedValue = this.formatPureValue(convertedValue, inferredType);
        return this.truncatePureValue(formattedValue);
    }

    truncatePureValue(value, maxLength = 68) {
        // Truncate pure values to maxLength characters with hover showing full value
        // Don't truncate formatted numbers (with underscores) - these are u64/u128/u256 values
        const isFormattedNumber = /^-?\d[\d_]*$/.test(value);

        if (value.length <= maxLength || isFormattedNumber) {
            return `<span class="pure-value">${this.encodeHTML(value)}</span>`;
        }

        const truncated = value.substring(0, maxLength);
        const encodedFull = this.encodeHTML(value);
        const encodedTruncated = this.encodeHTML(truncated);

        // Use the same custom tooltip system as the rest of the app
        return `<span class="pure-value pure-value-truncated custom-tooltip" data-tooltip="${encodedFull}" style="cursor: help; text-decoration: underline dotted;">${encodedTruncated}...</span>`;
    }

    formatPureArgumentWithType(argument, inputs, typeInput = null, forceHex = false) {
        // Format a pure argument when we might have type information available
        // forceHex: true for inputs section, false for commands section
        if (argument.Input !== undefined && inputs && inputs[argument.Input] && inputs[argument.Input].Pure) {
            const pureData = inputs[argument.Input].Pure;
            if (Array.isArray(pureData)) {
                // Use explicit type if provided, otherwise infer from context
                const baseArg = this.formatArgument(argument, inputs, null); // Get base argument without cache data
                const formattedPure = this.formatPureInput(pureData, 'general', typeInput, forceHex);
                return `${baseArg}(${formattedPure})`;
            }
        }
        return this.formatArgument(argument, inputs, null);
    }

    inferCommandReturnType(cmdIndex, resultIndex = 0) {
        // Look up the return type of a command by its index
        // resultIndex is used for NestedResult (Cmd_X.Y where Y is the resultIndex)
        if (this.commandReturnTypes && this.commandReturnTypes[cmdIndex]) {
            const returnTypes = this.commandReturnTypes[cmdIndex];

            // If it's an array of return types (multiple values)
            if (Array.isArray(returnTypes)) {
                if (resultIndex < returnTypes.length) {
                    return returnTypes[resultIndex];
                }
                return 'unknown'; // Index out of bounds
            }

            // Single return value - only valid if resultIndex is 0
            if (resultIndex === 0) {
                return returnTypes;
            }
        }

        return 'unknown';
    }

    /**
     * Unified type formatting - converts any type representation to formatted HTML with nested tooltips
     * Supports both PTB MoveType objects and simple type strings
     */
    formatTypeUnified(typeInput, cacheDataOrTransaction = null, maxLength = null) {
        // Convert PTB MoveType to our internal representation
        const typeTree = this.convertToTypeTree(typeInput);

        // Format with nested tooltips
        return this.formatTypeTreeToHTML(typeTree, cacheDataOrTransaction, maxLength);
    }

    /**
     * Convert any type input (PTB MoveType, string, or object_type from cache) to a normalized tree structure
     */
    convertToTypeTree(typeInput) {
        if (!typeInput) return null;

        // Handle string type (from old code paths)
        if (typeof typeInput === 'string') {
            return this.parseTypeString(typeInput);
        }

        // Handle cache MoveObject format: { address, module, name, type_args }
        if (typeInput.address && typeInput.module && typeInput.name) {
            return {
                package: typeInput.address,
                module: typeInput.module,
                name: typeInput.name,
                typeArgs: (typeInput.type_args || []).map(arg => this.convertToTypeTree(arg))
            };
        }

        // Handle cache object_type format with struct wrapper
        if (typeInput.struct) {
            return {
                package: typeInput.struct.address,
                module: typeInput.struct.module,
                name: typeInput.struct.name,
                typeArgs: (typeInput.struct.type_args || []).map(arg => this.convertToTypeTree(arg))
            };
        }

        // Handle PTB MoveType enum variants
        if (typeInput.Bool !== undefined) return { primitive: 'bool' };
        if (typeInput.U8 !== undefined) return { primitive: 'u8' };
        if (typeInput.U16 !== undefined) return { primitive: 'u16' };
        if (typeInput.U32 !== undefined) return { primitive: 'u32' };
        if (typeInput.U64 !== undefined) return { primitive: 'u64' };
        if (typeInput.U128 !== undefined) return { primitive: 'u128' };
        if (typeInput.U256 !== undefined) return { primitive: 'u256' };
        if (typeInput.Address !== undefined) return { primitive: 'address' };

        // Handle Vector
        if (typeInput.Vector) {
            return {
                vector: true,
                element: this.convertToTypeTree(typeInput.Vector)
            };
        }

        // Handle Datatype (simple struct without type args)
        if (typeInput.Datatype) {
            const [address, module, name, _] = typeInput.Datatype;
            return {
                package: address,
                module: module,
                name: name,
                typeArgs: []
            };
        }

        // Handle DatatypeInstantiation (struct with type args)
        if (typeInput.DatatypeInstantiation) {
            const [[address, module, name, _], typeArgs] = typeInput.DatatypeInstantiation;
            return {
                package: address,
                module: module,
                name: name,
                typeArgs: (typeArgs || []).map(arg => this.convertToTypeTree(arg))
            };
        }

        // Handle Reference
        if (typeInput.Reference) {
            return {
                reference: true,
                mutable: false,
                inner: this.convertToTypeTree(typeInput.Reference)
            };
        }

        // Handle MutableReference
        if (typeInput.MutableReference) {
            return {
                reference: true,
                mutable: true,
                inner: this.convertToTypeTree(typeInput.MutableReference)
            };
        }

        // Handle TypeParameter
        if (typeInput.TypeParameter !== undefined) {
            return { typeParam: typeInput.TypeParameter };
        }

        return null;
    }

    /**
     * Parse a type string like "module::name<arg1, arg2>" into a tree structure
     */
    parseTypeString(typeStr) {
        const cleanType = typeStr.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').trim();

        // Handle references
        if (cleanType.startsWith('&mut ')) {
            return {
                reference: true,
                mutable: true,
                inner: this.parseTypeString(cleanType.substring(5))
            };
        }
        if (cleanType.startsWith('&')) {
            return {
                reference: true,
                mutable: false,
                inner: this.parseTypeString(cleanType.substring(1).trim())
            };
        }

        // Handle primitives (normalize Address to address)
        const primitives = ['bool', 'u8', 'u16', 'u32', 'u64', 'u128', 'u256', 'address'];
        const normalizedType = cleanType.toLowerCase();
        if (primitives.includes(normalizedType)) {
            return { primitive: normalizedType };
        }

        // Handle vector
        if (cleanType.startsWith('vector<') && cleanType.endsWith('>')) {
            const inner = cleanType.substring(7, cleanType.length - 1);
            return {
                vector: true,
                element: this.parseTypeString(inner)
            };
        }

        // Handle struct types
        const genericStart = cleanType.indexOf('<');
        if (genericStart === -1) {
            // Simple type like "module::name" or "0xpackage::module::name"
            const parts = cleanType.split('::');
            if (parts.length === 2) {
                return {
                    package: null,
                    module: parts[0],
                    name: parts[1],
                    typeArgs: []
                };
            } else if (parts.length === 3) {
                // Fully qualified: "0xpackage::module::name"
                return {
                    package: parts[0],
                    module: parts[1],
                    name: parts[2],
                    typeArgs: []
                };
            }
            return { primitive: cleanType };
        }

        // Generic type like "module::name<arg1, arg2>" or "0xpackage::module::name<arg1, arg2>"
        const basename = cleanType.substring(0, genericStart);
        const parts = basename.split('::');
        const argsStr = cleanType.substring(genericStart + 1, cleanType.lastIndexOf('>'));

        // Parse type arguments (handle nested generics)
        const typeArgs = this.splitTypeArgs(argsStr).map(arg => this.parseTypeString(arg));

        if (parts.length === 2) {
            return {
                package: null,
                module: parts[0],
                name: parts[1],
                typeArgs: typeArgs
            };
        } else if (parts.length === 3) {
            return {
                package: parts[0],
                module: parts[1],
                name: parts[2],
                typeArgs: typeArgs
            };
        }

        return null;
    }

    /**
     * Split type arguments respecting nesting: "a<b, c>, d" => ["a<b, c>", "d"]
     */
    splitTypeArgs(argsStr) {
        const args = [];
        let current = '';
        let depth = 0;

        for (let i = 0; i < argsStr.length; i++) {
            const char = argsStr[i];
            if (char === '<') {
                depth++;
                current += char;
            } else if (char === '>') {
                depth--;
                current += char;
            } else if (char === ',' && depth === 0) {
                if (current.trim()) {
                    args.push(current.trim());
                }
                current = '';
            } else {
                current += char;
            }
        }

        if (current.trim()) {
            args.push(current.trim());
        }

        return args;
    }

    /**
     * Convert type tree to HTML with properly nested tooltips
     * maxLength: if specified, will wrap type after this length
     */
    formatTypeTreeToHTML(typeTree, cacheDataOrTransaction = null, maxLength = null) {
        if (!typeTree) return 'unknown';

        // Handle primitives
        if (typeTree.primitive) {
            return typeTree.primitive;
        }

        // Handle type parameters
        if (typeTree.typeParam !== undefined) {
            return `T${typeTree.typeParam}`;
        }

        // Handle references
        if (typeTree.reference) {
            const prefix = typeTree.mutable ? '&amp;mut ' : '&amp;';
            return prefix + this.formatTypeTreeToHTML(typeTree.inner, cacheDataOrTransaction, maxLength);
        }

        // Handle vector
        if (typeTree.vector) {
            const elementHTML = this.formatTypeTreeToHTML(typeTree.element, cacheDataOrTransaction, maxLength);
            return `vector&lt;${elementHTML}&gt;`;
        }

        // Handle struct types
        if (typeTree.module && typeTree.name) {
            // Find package ID if not already provided
            let packageId = typeTree.package;
            if (!packageId || packageId === 'null') {
                packageId = this.findPackageForType(typeTree.module, typeTree.name, cacheDataOrTransaction);
            }

            // Normalize package address
            if (packageId && !packageId.startsWith('0x')) {
                packageId = `0x${packageId}`;
            }

            // Build the full qualified type string for the tooltip
            const fullQualified = this.buildFullQualifiedType(typeTree, packageId, cacheDataOrTransaction);
            const displayType = `${typeTree.module}::${typeTree.name}`;

            // Create the HTML with tooltip
            let html = `<span class="custom-tooltip" data-tooltip="${fullQualified}" style="cursor: help; text-decoration: underline dotted; color: #87ceeb;">${displayType}</span>`;

            // Add type arguments if present
            if (typeTree.typeArgs && typeTree.typeArgs.length > 0) {
                // Check if we should wrap - wrap if type exceeds maxLength
                if (maxLength && this.shouldWrapType(typeTree, maxLength)) {
                    html += '&lt;<br>';
                    for (let i = 0; i < typeTree.typeArgs.length; i++) {
                        // Wrap each type argument in a span with left margin for indentation
                        const typeArgHTML = this.formatTypeTreeToHTML(typeTree.typeArgs[i], cacheDataOrTransaction, null);
                        html += `<span style="display: inline-block; margin-left: 32px;">${typeArgHTML},</span><br>`;
                    }
                    html += '&gt;';
                } else {
                    html += '&lt;';
                    for (let i = 0; i < typeTree.typeArgs.length; i++) {
                        html += this.formatTypeTreeToHTML(typeTree.typeArgs[i], cacheDataOrTransaction, null);
                        if (i < typeTree.typeArgs.length - 1) {
                            html += ', ';
                        }
                    }
                    html += '&gt;';
                }
            }

            return html;
        }

        return 'unknown';
    }

    /**
     * Check if a type should be wrapped based on its estimated length
     */
    shouldWrapType(typeTree, maxLength) {
        const estimatedLength = this.estimateTypeLength(typeTree);
        return estimatedLength > maxLength;
    }

    /**
     * Estimate the display length of a type (without HTML tags)
     */
    estimateTypeLength(typeTree) {
        if (!typeTree) return 0;

        if (typeTree.primitive) {
            return typeTree.primitive.length;
        }

        if (typeTree.typeParam !== undefined) {
            return 2; // "T" + digit
        }

        if (typeTree.reference) {
            const prefix = typeTree.mutable ? '&mut ' : '&';
            return prefix.length + this.estimateTypeLength(typeTree.inner);
        }

        if (typeTree.vector) {
            return 7 + this.estimateTypeLength(typeTree.element) + 1; // "vector<" + element + ">"
        }

        if (typeTree.module && typeTree.name) {
            let length = typeTree.module.length + 2 + typeTree.name.length; // module::name

            if (typeTree.typeArgs && typeTree.typeArgs.length > 0) {
                length += 1; // <
                for (let i = 0; i < typeTree.typeArgs.length; i++) {
                    length += this.estimateTypeLength(typeTree.typeArgs[i]);
                    if (i < typeTree.typeArgs.length - 1) {
                        length += 2; // ", "
                    }
                }
                length += 1; // >
            }

            return length;
        }

        return 0;
    }

    /**
     * Build full qualified type string for tooltip
     */
    buildFullQualifiedType(typeTree, packageId, cacheDataOrTransaction) {
        if (!typeTree) return '';

        // Primitives
        if (typeTree.primitive) return typeTree.primitive;

        // Type parameters
        if (typeTree.typeParam !== undefined) return `T${typeTree.typeParam}`;

        // References
        if (typeTree.reference) {
            const prefix = typeTree.mutable ? '&mut ' : '&';
            return prefix + this.buildFullQualifiedType(typeTree.inner, null, cacheDataOrTransaction);
        }

        // Vector
        if (typeTree.vector) {
            const element = this.buildFullQualifiedType(typeTree.element, null, cacheDataOrTransaction);
            return `vector<${element}>`;
        }

        // Struct types
        if (typeTree.module && typeTree.name) {
            let base;
            if (packageId) {
                base = `${packageId}::${typeTree.module}::${typeTree.name}`;
            } else {
                base = `${typeTree.module}::${typeTree.name}`;
            }

            if (typeTree.typeArgs && typeTree.typeArgs.length > 0) {
                const args = typeTree.typeArgs.map(arg => {
                    // For nested types, find their package IDs
                    let argPackage = arg.package;
                    if (arg.module && arg.name && (!argPackage || argPackage === 'null')) {
                        argPackage = this.findPackageForType(arg.module, arg.name, cacheDataOrTransaction);
                    }
                    return this.buildFullQualifiedType(arg, argPackage, cacheDataOrTransaction);
                }).join(', ');
                return `${base}<${args}>`;
            }

            return base;
        }

        return '';
    }

    createHoverForType(typeString, cacheData = null) {
        // Redirect to unified formatter
        return this.formatTypeUnified(typeString, cacheData);
    }

    parseTypeWithHovers(typeString, cacheData = null) {
        // Redirect to unified formatter
        return this.formatTypeUnified(typeString, cacheData);
    }

    parseTypeStructure(typeStr) {
        // Parse a type string into a structure that preserves individual components
        const tokens = this.tokenizeType(typeStr);
        return this.parseTokens(tokens);
    }

    tokenizeType(typeStr) {
        // Tokenize the type string, preserving structure
        const tokens = [];
        let current = '';
        let depth = 0;

        for (let i = 0; i < typeStr.length; i++) {
            const char = typeStr[i];

            if (char === '<') {
                if (current.trim()) {
                    tokens.push({ type: 'typename', value: current.trim() });
                    current = '';
                }
                tokens.push({ type: 'open', value: '<' });
                depth++;
            } else if (char === '>') {
                if (current.trim()) {
                    tokens.push({ type: 'typename', value: current.trim() });
                    current = '';
                }
                tokens.push({ type: 'close', value: '>' });
                depth--;
            } else if (char === ',' && depth > 0) {
                if (current.trim()) {
                    tokens.push({ type: 'typename', value: current.trim() });
                    current = '';
                }
                tokens.push({ type: 'separator', value: ', ' });
            } else {
                current += char;
            }
        }

        if (current.trim()) {
            tokens.push({ type: 'typename', value: current.trim() });
        }

        return tokens;
    }

    parseTokens(tokens) {
        // Convert tokens into a structured representation
        const result = [];
        let i = 0;

        while (i < tokens.length) {
            const token = tokens[i];

            if (token.type === 'typename') {
                // Check if next token is an opening bracket
                if (i + 1 < tokens.length && tokens[i + 1].type === 'open') {
                    // This is a generic type
                    const genericType = {
                        type: 'generic',
                        typename: token.value,
                        args: []
                    };

                    i += 2; // Skip typename and open bracket

                    // Parse generic arguments
                    while (i < tokens.length && tokens[i].type !== 'close') {
                        if (tokens[i].type === 'typename') {
                            genericType.args.push({
                                type: 'simple',
                                typename: tokens[i].value
                            });
                        } else if (tokens[i].type === 'separator') {
                            // Skip separators
                        }
                        i++;
                    }

                    result.push(genericType);
                    i++; // Skip close bracket
                } else {
                    // Simple type
                    result.push({
                        type: 'simple',
                        typename: token.value
                    });
                    i++;
                }
            } else {
                i++;
            }
        }

        return result;
    }

    convertToHoverHTML(parsedTypes, cacheData = null) {
        // Convert parsed type structure to HTML with individual hover tooltips
        let html = '';

        for (let i = 0; i < parsedTypes.length; i++) {
            const typeObj = parsedTypes[i];

            if (typeObj.type === 'simple') {
                html += this.createSingleTypeHover(typeObj.typename, cacheData);
            } else if (typeObj.type === 'generic') {
                // Create hover for the main type (e.g., "pool::Pool")
                html += this.createSingleTypeHover(typeObj.typename, cacheData);
                html += '&lt;';

                // Create individual hovers for each type argument
                for (let j = 0; j < typeObj.args.length; j++) {
                    const arg = typeObj.args[j];
                    html += this.createSingleTypeHover(arg.typename, cacheData);

                    if (j < typeObj.args.length - 1) {
                        html += ', ';
                    }
                }

                html += '&gt;';
            }
        }

        return html;
    }

    createSingleTypeHover(typename, cacheData = null) {
        // Create hover tooltip for a single type component
        if (!typename.includes('::')) {
            // Not a qualified type, return as-is
            return typename;
        }

        const [module, typeName] = typename.split('::');

        // For known system types, add hover with standard package
        let packageId;
        if (module === 'coin' || module === 'sui' || module === 'dynamic_field') {
            packageId = '0x0000000000000000000000000000000000000000000000000000000000000002';
        } else {
            // Try to find the package ID from cache data for non-system types
            packageId = this.findPackageForType(module, typeName, cacheData);
            if (!packageId) {
                packageId = 'package'; // Fallback
            }
        }

        const fullType = packageId === 'package' ? typename : `${packageId}::${module}::${typeName}`;
        const shortType = `${module}::${typeName}`;

        return `<span class="custom-tooltip" data-tooltip="${fullType}" style="cursor: help; text-decoration: underline dotted; color: #87ceeb;">${shortType}</span>`;
    }

    findPackageForType(module, typeName, cacheData) {
        // Search cache entries to find the package ID for a given module::type
        if (!cacheData || !cacheData.cache_entries) {
            return null;
        }

        for (const entry of cacheData.cache_entries) {
            if (entry.object_type.Package) {
                const pkg = entry.object_type.Package;
                // Check if this package contains the module
                if (pkg.module_names && pkg.module_names.includes(module)) {
                    // Return the package address
                    return entry.object_id;
                }
            } else if (entry.object_type.MoveObject) {
                const moveObj = entry.object_type.MoveObject;
                // Check if this object is of the type we're looking for
                if (moveObj.module === module && moveObj.name === typeName) {
                    return moveObj.address.startsWith('0x') ? moveObj.address : `0x${moveObj.address}`;
                }
            }
        }

        return null;
    }

    analyzeTransaction() {
        try {
            this.hideError();

            // Create Transaction object from loaded files
            this.transaction = Transaction.fromFiles(this.files);

            // Generate output using Transaction object
            this.renderTransactionOverview(this.transaction);
            this.renderObjectsTouched(this.transaction);
            this.renderObjectChanges(this.transaction);
            this.renderGasAnalysis(this.transaction);
            this.renderRawJson(this.transaction);

            // Create analysis tabs and switch to overview
            this.createAnalysisTabs();
            this.switchToTab('overview');

            // Set up tooltips for all tabs after all rendering is complete
            setTimeout(() => {
                this.setupCustomTooltips();
            }, 100);

        } catch (error) {
            this.showError(`Analysis error: ${error.message}\n${error.stack}`);
        }
    }

    renderTransactionOverview(transaction) {
        const container = document.getElementById('transaction-overview');

        // Extract data from Transaction object
        const digest = transaction.digest || 'N/A';
        const epoch = transaction.epoch || 'N/A';
        const checkpoint = transaction.checkpoint || 'N/A';
        const protocolVersion = transaction.protocol_version || 'N/A';
        const sender = transaction.sender || 'N/A';

        // Format status
        let status = 'N/A';
        let statusColor = 'inherit';
        if (transaction.status) {
            if (transaction.status === 'Success' || transaction.status.Success !== undefined) {
                status = 'Success';
                statusColor = '#90ee90';
            } else if (transaction.status.Failure) {
                const failure = transaction.status.Failure;
                const errorJson = JSON.stringify(failure.error, null, 2);
                status = `Failure: ${errorJson}`;
                statusColor = '#ff6b6b';
            }
        }

        // Gas data
        const gasPrice = transaction.gas_data.price !== null ? this.formatNumber(transaction.gas_data.price) : 'N/A';
        const gasBudget = transaction.gas_data.budget !== null ? this.formatNumber(transaction.gas_data.budget) : 'N/A';
        const computationCost = transaction.gas_data.computation_cost !== null ? this.formatNumber(transaction.gas_data.computation_cost) : 'N/A';
        const storageCost = transaction.gas_data.storage_cost !== null ? this.formatNumber(transaction.gas_data.storage_cost) : 'N/A';
        const storageRebate = transaction.gas_data.storage_rebate !== null ? `-${this.formatNumber(transaction.gas_data.storage_rebate)}` : 'N/A';
        const nonRefundableStorageFee = transaction.gas_data.non_refundable_fee !== null ? this.formatNumber(transaction.gas_data.non_refundable_fee) : 'N/A';

        // Calculate net gas charges
        let netGasCharges = 'N/A';
        let gasChargesColor = 'inherit';
        if (transaction.gas_data.computation_cost !== null && transaction.gas_data.storage_cost !== null &&
            transaction.gas_data.non_refundable_fee !== null && transaction.gas_data.storage_rebate !== null) {
            const netValue = parseInt(transaction.gas_data.computation_cost) + parseInt(transaction.gas_data.storage_cost) +
                           parseInt(transaction.gas_data.non_refundable_fee) - parseInt(transaction.gas_data.storage_rebate);
            netGasCharges = this.formatNumber(netValue);
            gasChargesColor = netValue >= 0 ? '#ff6b6b' : '#90ee90';
        }

        // Format gas coins table
        let gasCoinsTable = '<table id="gas-coins-table" style="width: 100%; border-collapse: collapse; margin-top: 10px;"><thead><tr style="border-bottom: 1px solid #555;"><th style="text-align: left; padding: 5px; color: #4a9eff;">Object ID</th><th style="text-align: left; padding: 5px; color: #4a9eff;">Version</th><th style="text-align: left; padding: 5px; color: #4a9eff;">Status</th></tr></thead><tbody>';

        if (transaction.gas_data.payment && transaction.gas_data.payment.length > 0) {
            transaction.gas_data.payment.forEach(paymentObj => {
                const objId = paymentObj[0];
                const version = paymentObj[1] || 'N/A';
                const linkedObj = this.createExplorerLink(objId, 'object');
                const isDeleted = transaction.isObjectDeleted(objId);
                const status = isDeleted ? '<span style="color: #ff6b6b;">Deleted</span>' : '<span style="color: #90ee90;">Modified</span>';

                gasCoinsTable += `<tr><td style="padding: 5px; font-family: monospace;">${linkedObj}</td><td style="padding: 5px; text-align: right;">${version}</td><td style="padding: 5px;">${status}</td></tr>`;
            });
        } else {
            gasCoinsTable += '<tr><td colspan="3" style="padding: 5px; text-align: center;">N/A</td></tr>';
        }
        gasCoinsTable += '</tbody></table>';

        let html = `
            <p style="margin: 0 0 20px 0; color: #ccc; font-style: italic;">
                This tab provides a quick overall view of the transaction, including basic details, gas costs, and transaction type information.
            </p>
            <div class="overview-section">
                <h4 class="overview-section-title">Transaction Details</h4>
                <div class="overview-subsection">
                    <div class="overview-item">
                        <span class="overview-label">Digest:</span>
                        <span class="overview-value">${this.createExplorerLink(digest, 'txblock')}</span>
                    </div>
                    <div class="overview-item">
                        <span class="overview-label">Sender:</span>
                        <span class="overview-value">${this.createExplorerLink(sender, 'account')}</span>
                    </div>
                    <div class="overview-item">
                        <span class="overview-label">Epoch:</span>
                        <span class="overview-value">${epoch}</span>
                        <span class="overview-label" style="margin-left: 40px;">Checkpoint:</span>
                        <span class="overview-value">${checkpoint}</span>
                        <span class="overview-label" style="margin-left: 40px;">Protocol Version:</span>
                        <span class="overview-value">${protocolVersion}</span>
                    </div>
                    <div class="overview-item">
                        <span class="overview-label">Status:</span>
                        <span class="overview-value" style="color: ${statusColor}; font-weight: bold;">${status}</span>
                    </div>
                </div>
            </div>
            <div class="overview-section">
                <h4 class="overview-section-title">Gas</h4>
                <div class="overview-subsection">
                    <table style="border-collapse: collapse; width: auto;">
                        <tbody>
                            <tr>
                                <td style="padding: 4px 8px 4px 0; color: #4a9eff; font-weight: bold;">Price:</td>
                                <td style="padding: 4px 0; font-family: monospace; text-align: right;">${gasPrice}</td>
                            </tr>
                            <tr>
                                <td style="padding: 4px 8px 4px 0; color: #4a9eff; font-weight: bold;">Budget:</td>
                                <td style="padding: 4px 0; font-family: monospace; text-align: right;">${gasBudget}</td>
                            </tr>
                            <tr>
                                <td colspan="2" style="padding: 8px 0; border-top: 1px solid #555;"></td>
                            </tr>
                            <tr>
                                <td style="padding: 4px 8px 4px 0; color: #4a9eff; font-weight: bold;">Computation Cost:</td>
                                <td style="padding: 4px 0; font-family: monospace; text-align: right;">${computationCost}</td>
                            </tr>
                            <tr>
                                <td style="padding: 4px 8px 4px 0; color: #4a9eff; font-weight: bold;">Storage Cost:</td>
                                <td style="padding: 4px 0; font-family: monospace; text-align: right;">${storageCost}</td>
                            </tr>
                            <tr>
                                <td style="padding: 4px 8px 4px 0; color: #4a9eff; font-weight: bold;">Non-Refundable Fee:</td>
                                <td style="padding: 4px 0; font-family: monospace; text-align: right;">${nonRefundableStorageFee}</td>
                            </tr>
                            <tr>
                                <td style="padding: 4px 8px 4px 0; color: #4a9eff; font-weight: bold;">Storage Rebate:</td>
                                <td style="padding: 4px 0; font-family: monospace; text-align: right;">${storageRebate}</td>
                            </tr>
                            <tr>
                                <td colspan="2" style="padding: 8px 0; border-top: 2px solid #777;"></td>
                            </tr>
                            <tr>
                                <td style="padding: 4px 8px 4px 0; color: #4a9eff; font-weight: bold;">Gas Charges:</td>
                                <td style="padding: 4px 0; font-family: monospace; text-align: right; color: ${gasChargesColor};">${netGasCharges}</td>
                            </tr>
                        </tbody>
                    </table>
                    <h4 style="margin: 20px 0 10px 0; color: #4a9eff;">Gas Coins:</h4>
                    ${gasCoinsTable}
                </div>
            </div>
        `;

        // Transaction type section (last section with bigger type)
        if (transaction.kind && transaction.kind.ProgrammableTransaction) {
            const ptb = transaction.kind.ProgrammableTransaction;
            const inputs = ptb.inputs || [];
            const commands = ptb.commands || [];

            html += `
                <div class="overview-section">
                    <h4 class="overview-section-title">Transaction Type</h4>
                    <div class="overview-subsection">
                        <div class="overview-item">
                            <span class="overview-label">Type:</span>
                            <span class="overview-value" style="font-size: 1.3em; font-weight: bold;">ProgrammableTransaction</span>
                        </div>
                        <div class="subsection">
                            <h4>Inputs (${inputs.length}):</h4>
                            <div style="background: #222; padding: 15px; border-radius: 5px; overflow-x: auto;">
                                <table style="width: 100%; border-collapse: collapse; font-family: monospace;">
                                    <thead>
                                        <tr style="background: #333;">
                                            <th style="padding: 10px; text-align: left; color: #4a9eff; border-bottom: 2px solid #4a9eff; width: 10%;">Mnemonic</th>
                                            <th style="padding: 10px; text-align: left; color: #4a9eff; border-bottom: 2px solid #4a9eff; width: 15%;">Input Type</th>
                                            <th style="padding: 10px; text-align: left; color: #4a9eff; border-bottom: 2px solid #4a9eff; width: 45%;">Object ID or Value</th>
                                            <th style="padding: 10px; text-align: left; color: #4a9eff; border-bottom: 2px solid #4a9eff; width: 30%;">Object Type</th>
                                        </tr>
                                    </thead>
                                    <tbody>
            `;

            inputs.forEach((input, i) => {
                let typeVariant = '';
                let objectType = '';
                let objectId = '';

                if (input.Pure) {
                    typeVariant = 'Pure';
                    objectType = ''; // No object type for Pure
                    // For inputs, always show as hex byte array, truncate at 68 chars (0x + 66 hex chars = 33 bytes)
                    const bytes = input.Pure;
                    const maxBytes = 33; // 33 bytes = 66 hex chars, which with "0x" = 68 total chars
                    const displayBytes = bytes.slice(0, maxBytes);
                    const hexBytes = displayBytes.map(b => b.toString(16).padStart(2, '0')).join('');

                    if (bytes.length > maxBytes) {
                        // If truncated, add tooltip with full value
                        const fullHexBytes = bytes.map(b => b.toString(16).padStart(2, '0')).join('');
                        const fullHex = '0x' + fullHexBytes;
                        objectId = `<span class="custom-tooltip" data-tooltip="${fullHex}" style="cursor: help; text-decoration: underline dotted; color: #87ceeb;">0x${hexBytes}...</span>`;
                    } else {
                        objectId = '0x' + hexBytes;
                    }
                } else if (input.Object) {
                    if (input.Object.ImmOrOwnedObject) {
                        typeVariant = 'ImmOrOwned';
                        const objRef = input.Object.ImmOrOwnedObject;
                        objectId = this.createExplorerLink(objRef[0], 'object');
                        objectType = this.createTypeWithTooltip(objRef[0], transaction, 50);
                    } else if (input.Object.SharedObject) {
                        const shared = input.Object.SharedObject;
                        typeVariant = shared.mutable ? 'mut Shared' : 'Shared';
                        objectId = this.createExplorerLink(shared.id, 'object');
                        objectType = this.createTypeWithTooltip(shared.id, transaction, 50);
                    } else if (input.Object.Receiving) {
                        typeVariant = 'Receiving';
                        const objRef = input.Object.Receiving;
                        objectId = this.createExplorerLink(objRef[0], 'object');
                        objectType = this.createTypeWithTooltip(objRef[0], transaction, 50);
                    }
                } else if (input.FundsWithdrawal) {
                    typeVariant = 'FundsWithdrawal';
                    objectType = '';
                    objectId = 'FundsWithdrawalArg';
                } else {
                    typeVariant = 'Unknown';
                    objectType = '';
                    objectId = JSON.stringify(input);
                }

                // Build table row with 4 columns: Index, Input Type, Value, Value Type
                html += `<tr>`;
                html += `<td style="padding: 8px; border-bottom: 1px solid #333; color: white; vertical-align: top; width: 10%;">Input_${i}</td>`;
                html += `<td style="padding: 8px; border-bottom: 1px solid #333; color: white; vertical-align: top; width: 15%;">${typeVariant}</td>`;
                html += `<td style="padding: 8px; border-bottom: 1px solid #333; color: white; vertical-align: top; word-break: break-all; width: 45%;">${objectId}</td>`;
                html += `<td style="padding: 8px; border-bottom: 1px solid #333; color: white; vertical-align: top; white-space: normal; width: 30%;">${objectType}</td>`;
                html += `</tr>`;
            });

            html += `
                                    </tbody>
                                </table>
                            </div>
            `;

            html += `
                        </div>
                        <h4>Commands (${commands.length}):</h4>
                        <div style="background: #222; padding: 15px; border-radius: 5px; overflow-x: auto;">
                            <table style="width: 100%; border-collapse: collapse; font-family: monospace;">
                                <thead>
                                    <tr style="background: #333;">
                                        <th style="padding: 10px; text-align: left; color: #4a9eff; border-bottom: 2px solid #4a9eff; width: 10%;">Mnemonic</th>
                                        <th style="padding: 10px; text-align: left; color: #4a9eff; border-bottom: 2px solid #4a9eff; width: 25%;">Command</th>
                                        <th style="padding: 10px; text-align: left; color: #4a9eff; border-bottom: 2px solid #4a9eff; width: 65%;">Arguments</th>
                                    </tr>
                                </thead>
                                <tbody>
            `;

            // Initialize command return types storage
            // Structure: { cmdIndex: [type1, type2, ...] } for multiple return values
            this.commandReturnTypes = {};

            // Get parsed Command objects
            const parsedCommands = transaction.getCommands();

            // First pass: populate all command return types so they're available during formatting
            commands.forEach((cmd, i) => {
                const parsedCommand = parsedCommands[i];
                const ptbSignature = cmd._signature;
                let returnType = 'unknown';

                if (cmd.MoveCall) {
                    if (ptbSignature && ptbSignature.return_types && ptbSignature.return_types.length > 0) {
                        returnType = ptbSignature.return_types.map(retType => this.ptbTypeToString(retType));
                    } else {
                        returnType = 'void';
                    }
                } else if (cmd.SplitCoins) {
                    const [_coin, amounts] = cmd.SplitCoins;
                    const numReturns = amounts ? amounts.length : 1;
                    const coinTypeString = parsedCommand && parsedCommand.coinType
                        ? parsedCommand.coinType.toFullyQualifiedString()
                        : 'T';
                    returnType = Array(numReturns).fill(coinTypeString);
                } else if (cmd.MergeCoins) {
                    returnType = 'void';
                } else if (cmd.Publish) {
                    returnType = '0x0000000000000000000000000000000000000000000000000000000000000002::package::UpgradeCap';
                } else if (cmd.MakeMoveVec) {
                    if (parsedCommand && parsedCommand.elementType) {
                        returnType = `vector<${parsedCommand.elementType.toFullyQualifiedString()}>`;
                    } else {
                        returnType = 'vector<T>';
                    }
                } else if (cmd.TransferObjects || cmd.Upgrade) {
                    returnType = 'void';
                }

                this.commandReturnTypes[i] = returnType;
            });

            // Second pass: render commands with access to all return types
            commands.forEach((cmd, i) => {
                let commandType = '';
                let commandDetails = '';
                let returnType = 'unknown'; // Track the return type of this command
                let skipFormatting = false; // Flag to skip formatCommandDetails for pre-formatted commands

                // Get the parsed command object
                const parsedCommand = parsedCommands[i];

                // cmd is the raw command, _signature is the Move call signature
                const ptbSignature = cmd._signature; // Merged Move call signature from move_call_info

                if (cmd.MoveCall) {
                    commandType = 'MoveCall';
                    const moveCall = cmd.MoveCall;

                    // Use the parsed MoveCallCommand to get the properly formatted function
                    let formattedFunction;
                    if (parsedCommand && parsedCommand.function) {
                        formattedFunction = parsedCommand.function.toHTML();
                    } else {
                        // Fallback to old method
                        formattedFunction = this.formatMoveFunction(moveCall.package, moveCall.module, moveCall.function, moveCall.type_arguments, 60);
                    }

                    // Format arguments with type information from move call details
                    let formattedArgs = '';
                    if (moveCall.arguments && moveCall.arguments.length > 0) {
                        const argStrings = moveCall.arguments.map((arg, argIndex) => {
                            // If Move call signature is available, use it for more accurate typing
                            if (ptbSignature && ptbSignature.parameters && ptbSignature.parameters[argIndex]) {
                                const paramType = this.formatTypeFromPTB(ptbSignature.parameters[argIndex], transaction);

                                // Check if this is a pure input that needs value conversion
                                if (arg.Input !== undefined && inputs && inputs[arg.Input] && inputs[arg.Input].Pure) {
                                    const inputIndex = arg.Input;
                                    const pureData = inputs[arg.Input].Pure;
                                    const convertedValue = this.formatPureInput(pureData, 'general', ptbSignature.parameters[argIndex]);
                                    return this.formatArgumentWithType(`Input_${inputIndex}(${convertedValue})`, paramType, 100, 8, 4);
                                } else if (arg.Input !== undefined && inputs && inputs[arg.Input] && inputs[arg.Input].Object) {
                                    // This is an object input - include object ID
                                    const inputIndex = arg.Input;
                                    const input = inputs[inputIndex];
                                    let objectId = null;

                                    if (input.Object.ImmOrOwnedObject) {
                                        objectId = input.Object.ImmOrOwnedObject[0];
                                    } else if (input.Object.SharedObject) {
                                        objectId = input.Object.SharedObject.id;
                                    } else if (input.Object.Receiving) {
                                        objectId = input.Object.Receiving[0];
                                    }

                                    if (objectId) {
                                        const objectIdLink = this.createExplorerLink(objectId, 'object');
                                        return this.formatArgumentWithType(`Input_${inputIndex}(${objectIdLink})`, paramType, 100, 8, 4);
                                    } else {
                                        return this.formatArgumentWithType(`Input_${inputIndex}`, paramType, 100, 8, 4);
                                    }
                                } else {
                                    // Format the base argument without type info, then add move call type
                                    const baseArg = this.formatArgumentWithoutType(arg);
                                    return this.formatArgumentWithType(baseArg, paramType, 100, 8, 4);
                                }
                            }

                            // Fall back to existing logic when move call details not available
                            return this.formatArgument(arg, inputs, transaction);
                        });

                        // Format with each argument on its own line
                        formattedArgs = argStrings.map(arg => `    ${arg},`).join('\n');
                    }

                    commandDetails = formattedArgs ? `${formattedFunction}(\n${formattedArgs}\n)` : `${formattedFunction}()`;
                    skipFormatting = true; // Already formatted with line breaks

                    // Set return type from move call details (store clean types without HTML)
                    if (ptbSignature && ptbSignature.return_types && ptbSignature.return_types.length > 0) {
                        returnType = ptbSignature.return_types.map(retType => this.ptbTypeToString(retType));
                    } else {
                        returnType = 'void'; // No return types means void
                    }
                } else if (cmd.TransferObjects) {
                    commandType = 'TransferObjects';
                    const [objects, recipient] = cmd.TransferObjects;

                    // Create formatted object::ID type with tooltip (0x2::object::ID)
                    const objectIdType = `<span class="custom-tooltip" data-tooltip="0x0000000000000000000000000000000000000000000000000000000000000002::object::ID" style="cursor: help; text-decoration: underline dotted; color: #87ceeb;">object::ID</span>`;

                    // Format objects array with one element per line, including object IDs
                    const formattedObjects = Array.isArray(objects) ? objects.map(obj => {
                        // Get the object ID if this is an Input argument
                        let argDisplay = '';
                        if (obj.Input !== undefined) {
                            const inputIndex = obj.Input;
                            if (inputs && inputs[inputIndex] && inputs[inputIndex].Object) {
                                const input = inputs[inputIndex];
                                let objectId = null;

                                if (input.Object.ImmOrOwnedObject) {
                                    objectId = input.Object.ImmOrOwnedObject[0];
                                } else if (input.Object.SharedObject) {
                                    objectId = input.Object.SharedObject.id;
                                } else if (input.Object.Receiving) {
                                    objectId = input.Object.Receiving[0];
                                }

                                if (objectId) {
                                    const objectIdLink = this.createExplorerLink(objectId, 'object');
                                    argDisplay = `Input_${inputIndex}(${objectIdLink})`;
                                } else {
                                    argDisplay = `Input_${inputIndex}`;
                                }
                            } else {
                                argDisplay = `Input_${inputIndex}`;
                            }
                        } else {
                            argDisplay = this.formatArgumentWithoutType(obj);
                        }
                        // Use formatArgumentWithType for smart wrapping with 8 total spaces (4 base + 4 for wrapped type)
                        const formatted = this.formatArgumentWithType(argDisplay, objectIdType, 100, 8, 4);
                        return `    ${formatted},`;
                    }).join('\n') : '';

                    // Format recipient with value if it's a Pure input (address)
                    let formattedRecipient = this.formatArgumentWithoutType(recipient);
                    if (recipient.Input !== undefined && inputs && inputs[recipient.Input] && inputs[recipient.Input].Pure) {
                        const pureData = inputs[recipient.Input].Pure;
                        // Convert bytes to address
                        const addressBytes = pureData.map(b => b.toString(16).padStart(2, '0')).join('');
                        const addressValue = `0x${addressBytes}`;
                        // Create explorer link for the address
                        const addressLink = this.createExplorerLink(addressValue, 'account');
                        formattedRecipient = `${formattedRecipient}(${addressLink})`;
                    }

                    // Format with each argument on its own line
                    commandDetails = `objects: [\n${formattedObjects}\n],\nrecipient: ${formattedRecipient}: address`;
                    skipFormatting = true; // Already formatted, don't reformat

                    // TransferObjects returns nothing (void)
                    returnType = 'void';
                } else if (cmd.SplitCoins) {
                    const [coin, amounts] = cmd.SplitCoins;

                    // Use the parsed SplitCoinsCommand to get the properly formatted type
                    if (parsedCommand && parsedCommand.coinType) {
                        commandType = `SplitCoins&lt;${parsedCommand.coinType.toHTML()}&gt;`;
                    } else {
                        commandType = 'SplitCoins&lt;T&gt;';
                    }

                    // Format the coin argument - use "gas_coin: 0x2::coin::Coin<0x2::sui::SUI>" for GasCoin, otherwise use the formatted argument with object ID
                    let formattedCoin;
                    if (coin === "GasCoin" || (coin.GasCoin !== undefined)) {
                        const gasCoinType = this.createHoverForType('0x0000000000000000000000000000000000000000000000000000000000000002::coin::Coin<0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI>');
                        formattedCoin = `gas_coin: ${gasCoinType}`;
                    } else {
                        formattedCoin = this.formatArgumentWithObjectId(coin, inputs, transaction, 100, 4, 0);
                    }

                    // Format amounts array with one element per line
                    const formattedAmounts = amounts?.map(amt => {
                        const baseArg = this.formatArgument(amt, inputs, transaction);
                        if (amt.Input !== undefined && inputs && inputs[amt.Input] && inputs[amt.Input].Pure) {
                            const pureData = inputs[amt.Input].Pure;
                            if (Array.isArray(pureData)) {
                                // Use general pure value conversion with amount context
                                const formattedPure = this.formatPureInput(pureData, 'amount');
                                return `    ${baseArg}(${formattedPure}),`;
                            }
                        }
                        return `    ${baseArg},`;
                    }).join('\n') || '';

                    commandDetails = `${formattedCoin},\namounts: [\n${formattedAmounts}\n]`;
                    skipFormatting = true; // Already formatted, don't reformat

                    // SplitCoins returns multiple coins of the same type as the coin being split
                    // One coin for each amount in the amounts array
                    const numReturns = amounts ? amounts.length : 1;
                    // Use the fully qualified string from the parsed command's coin type
                    const coinTypeString = parsedCommand && parsedCommand.coinType
                        ? parsedCommand.coinType.toFullyQualifiedString()
                        : 'T';
                    returnType = Array(numReturns).fill(coinTypeString);
                } else if (cmd.MergeCoins) {
                    const [target, sources] = cmd.MergeCoins;

                    // Use the parsed MergeCoinsCommand to get the properly formatted type
                    if (parsedCommand && parsedCommand.coinType) {
                        commandType = `MergeCoins&lt;${parsedCommand.coinType.toHTML()}&gt;`;
                    } else {
                        commandType = 'MergeCoins&lt;T&gt;';
                    }

                    const formattedTarget = this.formatArgumentWithObjectId(target, inputs, transaction, 100, 4, 0);
                    // Format sources array with one element per line
                    const formattedSources = sources?.map(src => {
                        return `    ${this.formatArgumentWithObjectId(src, inputs, transaction, 100, 8, 4)},`;
                    }).join('\n') || '';
                    commandDetails = `${formattedTarget},\nsources: [\n${formattedSources}\n]`;
                    skipFormatting = true; // Already formatted, don't reformat

                    // MergeCoins doesn't return anything - it modifies the target coin in place
                    returnType = 'void';
                } else if (cmd.Publish) {
                    commandType = 'Publish';
                    const [modules, dependencies] = cmd.Publish;

                    // Calculate total size of all modules in bytes
                    let totalSize = 0;
                    if (Array.isArray(modules)) {
                        modules.forEach(module => {
                            if (Array.isArray(module)) {
                                totalSize += module.length;
                            }
                        });
                    }

                    // Create formatted object::ID type with tooltip (0x2::object::ID)
                    const objectIdType = `<span class="custom-tooltip" data-tooltip="0x0000000000000000000000000000000000000000000000000000000000000002::object::ID" style="cursor: help; text-decoration: underline dotted; color: #87ceeb;">object::ID</span>`;

                    // Format dependencies with their types on separate lines (4-space indent like other commands)
                    const formattedDeps = dependencies?.map(dep => {
                        const link = this.createExplorerLink(dep, 'package');
                        return `    ${link}: ${objectIdType},`;
                    }).join('\n') || '';

                    // Format with proper multi-line array structure like other commands
                    const moduleInfo = `modules[${modules?.length || 0}]: size: ${totalSize.toLocaleString()} bytes`;
                    if (formattedDeps) {
                        commandDetails = `${moduleInfo},\ndependencies: [\n${formattedDeps}\n]`;
                    } else {
                        commandDetails = `${moduleInfo},\ndependencies: []`;
                    }
                    skipFormatting = true; // Already formatted, don't reformat

                    // Publish returns UpgradeCap - store as fully qualified string
                    returnType = '0x0000000000000000000000000000000000000000000000000000000000000002::package::UpgradeCap';
                } else if (cmd.MakeMoveVec) {
                    const [typeTag, elements] = cmd.MakeMoveVec;

                    // Use the parsed MakeMoveVecCommand to get the properly formatted type
                    if (parsedCommand && parsedCommand.elementType) {
                        commandType = `MakeMoveVec&lt;${parsedCommand.elementType.toHTML()}&gt;`;
                        // MakeMoveVec returns a vector of the specified type - store as fully qualified string
                        returnType = `vector<${parsedCommand.elementType.toFullyQualifiedString()}>`;
                    } else {
                        commandType = 'MakeMoveVec&lt;T&gt;';
                        returnType = 'vector<T>';
                    }
                    const formattedElements = elements?.map(elem => this.formatArgument(elem, inputs, transaction)).join(', ') || '';
                    commandDetails = `[${formattedElements}]`;
                } else if (cmd.Upgrade) {
                    commandType = 'Upgrade';
                    const [modules, dependencies, packageId, upgradeTicket] = cmd.Upgrade;

                    // Calculate total size of all modules in bytes
                    let totalSize = 0;
                    if (Array.isArray(modules)) {
                        modules.forEach(module => {
                            if (Array.isArray(module)) {
                                totalSize += module.length;
                            }
                        });
                    }

                    // Create formatted object::ID type with tooltip (0x2::object::ID)
                    const objectIdType = `<span class="custom-tooltip" data-tooltip="0x0000000000000000000000000000000000000000000000000000000000000002::object::ID" style="cursor: help; text-decoration: underline dotted; color: #87ceeb;">object::ID</span>`;

                    // Format dependencies with their types on separate lines (4-space indent like other commands)
                    const formattedDeps = dependencies?.map(dep => {
                        const link = this.createExplorerLink(dep, 'package');
                        return `    ${link}: ${objectIdType},`;
                    }).join('\n') || '';

                    // Format package_id as explorer link
                    const packageLink = this.createExplorerLink(packageId, 'package');

                    // Format upgrade ticket argument
                    const formattedTicket = this.formatArgumentWithoutType(upgradeTicket);

                    // Format with proper multi-line structure like other commands
                    const moduleInfo = `modules[${modules?.length || 0}]: size: ${totalSize.toLocaleString()} bytes`;
                    let depsSection = '';
                    if (formattedDeps) {
                        depsSection = `,\ndependencies: [\n${formattedDeps}\n]`;
                    } else {
                        depsSection = `,\ndependencies: []`;
                    }
                    commandDetails = `${moduleInfo}${depsSection},\npackage: ${packageLink}: ${objectIdType},\nupgrade_ticket: ${formattedTicket}`;
                    skipFormatting = true; // Already formatted, don't reformat

                    // Upgrade returns UpgradeReceipt which is not typically used
                    returnType = 'void';
                } else {
                    const keys = Object.keys(cmd);
                    commandType = keys.length > 0 ? keys[0] : 'Unknown';
                    commandDetails = JSON.stringify(cmd);
                }

                // Note: commandReturnTypes[i] is already set in the first pass above

                // Format command details with proper line breaks and indentation (unless already formatted)
                const formattedDetails = skipFormatting ? commandDetails : this.formatCommandDetails(commandDetails, 100, 0);

                // Build table row
                html += `<tr>`;
                html += `<td style="padding: 8px; border-bottom: 1px solid #333; color: white; vertical-align: top;">Cmd_${i}</td>`;
                html += `<td style="padding: 8px; border-bottom: 1px solid #333; color: white; vertical-align: top; white-space: normal;">${commandType}</td>`;
                html += `<td style="padding: 8px; border-bottom: 1px solid #333; color: white; vertical-align: top; white-space: pre-wrap;">${formattedDetails}</td>`;
                html += `</tr>`;
            });

            html += `
                                </tbody>
                            </table>
                        </div>
            `;
            html += `</div>`;
            html += `</div>`;
        } else {
            const keys = Object.keys(kind);
            const txType = keys.length > 0 ? keys[0] : 'Unknown';
            html += `
                <div class="overview-section">
                    <h4 class="overview-section-title">Transaction Type</h4>
                    <div class="overview-subsection">
                        <div class="overview-item">
                            <span class="overview-label">Type:</span>
                            <span class="overview-value" style="font-size: 1.3em; font-weight: bold;">${txType}</span>
                        </div>
                    </div>
                </div>
            `;
        }

        // Dependencies section
        const dependencies = transaction.deps || [];
        if (dependencies.length > 0) {
            html += `
                <div class="overview-section">
                    <h4 class="overview-section-title">Dependencies (${dependencies.length})</h4>
                    <div style="font-family: monospace; background: #222; padding: 15px; border-radius: 5px; overflow-x: auto;">
            `;

            dependencies.forEach((depDigest, i) => {
                const linkedDigest = this.createExplorerLink(depDigest, 'txblock');

                // Format the tabulated line with compact alignment like inputs/commands
                const indexStr = `${i}`.padEnd(10);

                // Display with compact column alignment (no type since they're all transactions)
                html += `<div style="color: white; margin-bottom: 3px; padding-left: 20px; white-space: pre;">${indexStr}${linkedDigest}</div>`;
            });

            html += `
                    </div>
                </div>
            `;
        }

        container.innerHTML = html;
        this.makeSortable('gas-summary-table');
        this.makeSortable('gas-coins-table');
    }

    renderObjectsTouched(transaction) {
        const container = document.getElementById('objects-touched');

        // Extract needed data from transaction
        const createdObjects = new Set(transaction.getCreatedObjects().map(o => o.object_id));
        const operations = {
            Created: transaction.getCreatedObjects().map(o => o.object_id),
            Deleted: transaction.getDeletedObjects().map(o => o.object_id),
            None: transaction.getModifiedObjects().map(o => o.object_id)
        };

        let html = `
            <p style="margin: 0 0 20px 0; color: #ccc; font-style: italic;">
                This section shows all objects and packages involved in the transaction execution. The <strong>Source</strong> indicates how objects were involved: <strong>Input</strong> (transaction arguments), <strong>Gas</strong> (gas payment coins), or <strong>Runtime</strong> (loaded dynamically during execution or created). The <strong>Status</strong> shows what happened: <strong>Created</strong> (newly generated), <strong>Modified</strong> (state changed), <strong>Deleted</strong> (removed), or <strong>Accessed</strong> (read-only).
            </p>
        `;

        // Packages section - filter out created packages (they show in Move Objects section)
        const filteredPackages = transaction.packages.filter(pkg => !createdObjects.has(pkg.object_id));

        html += `<div class="overview-section">`;
        html += `<h3 class="overview-section-title">Packages (${filteredPackages.length})</h3>`;

        // Create packages table
        html += `<table id="packages-table" style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">`;
        html += `<thead><tr style="background: #333;"><th style="padding: 10px; text-align: left; color: #4a9eff; border-bottom: 2px solid #4a9eff;">Package ID</th><th style="padding: 10px; text-align: right; color: #4a9eff; border-bottom: 2px solid #4a9eff;">Version</th><th style="padding: 10px; text-align: center; color: #4a9eff; border-bottom: 2px solid #4a9eff;">Source</th><th style="padding: 10px; text-align: right; color: #4a9eff; border-bottom: 2px solid #4a9eff;">Modules</th></tr></thead>`;
        html += `<tbody>`;

        // Separate and sort packages - input packages first, then dependencies
        const inputPackages = [];
        const dependencyPackages = [];

        filteredPackages.forEach(pkg => {
            // Use source field to determine if package is input or dependency
            const pkgType = (pkg.source === 'Input' || pkg.source === 'Gas') ? 'Input' : 'Dependency';
            if (pkgType === 'Input') {
                inputPackages.push({ pkg, pkgType });
            } else {
                dependencyPackages.push({ pkg, pkgType });
            }
        });

        // Render input packages first, then dependencies
        const allPackages = [...inputPackages, ...dependencyPackages];
        allPackages.forEach(({ pkg, pkgType }) => {
            const pkgInfo = pkg.object_type.Package;
            const linkedPkg = this.createExplorerLink(pkg.object_id, 'package');
            const typeColor = pkgType === 'Input' ? '#90ee90' : '#ccc';

            html += `<tr>`;
            html += `<td style="padding: 8px; border-bottom: 1px solid #333; color: white; font-family: monospace;">${linkedPkg}</td>`;
            html += `<td style="padding: 8px; border-bottom: 1px solid #333; color: white; text-align: right; font-family: monospace;">${pkg.version}</td>`;
            html += `<td style="padding: 8px; border-bottom: 1px solid #333; color: ${typeColor}; text-align: center; font-weight: bold;">${pkgType}</td>`;
            html += `<td style="padding: 8px; border-bottom: 1px solid #333; color: white; text-align: right; font-family: monospace;">${pkgInfo.module_names.length}</td>`;
            html += `</tr>`;
        });

        html += `</tbody></table>`;
        html += `</div>`;

        // Move Objects section - include move objects + created packages
        // Created packages should appear here (not in Packages table) since they were touched in this transaction
        const createdPackages = transaction.packages.filter(pkg => createdObjects.has(pkg.object_id));
        let filteredObjects = [...transaction.objects, ...createdPackages];


        html += `<div class="overview-section">`;
        html += `<h3 class="overview-section-title">Move Objects (${filteredObjects.length})</h3>`;

        // Organize objects with their source, operation, and group by operation
        const modifiedObjectsArray = [];
        const accessedObjectsArray = [];
        const deletedObjectsArray = [];
        const createdObjectsArray = [];

        filteredObjects.forEach(obj => {
            const objId = obj.object_id;

            // Use source from object (already populated in Transaction model)
            const source = obj.source || 'Runtime';

            // Determine operation
            let operation = 'Accessed';
            if (operations.Created.includes(objId)) {
                operation = 'Created';
                createdObjectsArray.push({ obj, source, operation });
            } else if (operations.Deleted.includes(objId)) {
                operation = 'Deleted';
                deletedObjectsArray.push({ obj, source, operation });
            } else if (operations.None.includes(objId)) {
                operation = 'Modified';
                modifiedObjectsArray.push({ obj, source, operation });
            } else {
                accessedObjectsArray.push({ obj, source, operation });
            }
        });

        // Render in order: Modified, Accessed, Deleted, Created
        const allObjectsGroups = [...modifiedObjectsArray, ...accessedObjectsArray, ...deletedObjectsArray, ...createdObjectsArray];

        // Transform to unified table format
        const allObjectsForTable = allObjectsGroups.map(({ obj, source, operation }) => {
            const objType = this.createTypeWithTooltip(obj.object_id, transaction, 45);
            return {
                objId: obj.object_id,
                version: obj.version,
                operation,
                source,
                objType
            };
        });

        // Use unified table rendering function
        html += this.renderUnifiedObjectTable('objects-table', allObjectsForTable);
        html += `</div>`;
        container.innerHTML = html;
        this.makeSortable('packages-table');
        this.makeSortable('objects-table');
    }

    renderObjectChanges(transaction) {
        const container = document.getElementById('object-changes');

        let html = `
            <p style="margin: 0 0 20px 0; color: #ccc; font-style: italic;">
                This section shows the actual state changes captured in transaction effects. The <strong>Status</strong> indicates what happened: <strong>Created</strong> (newly generated), <strong>Modified</strong> (state changed), or <strong>Deleted</strong> (destroyed). The <strong>Source</strong> column shows the object's relationship to the transaction: <strong>Input</strong> (transaction arguments), <strong>Gas</strong> (payment coins), or <strong>Runtime</strong> (created during execution or loaded dynamically).
            </p>
        `;

        // Object Changes Table
        html += `<div class="overview-section">`;
        html += `<h3 style="color: white; margin: 15px 0 10px 0; font-size: 1.3em; font-weight: bold;">Object Changes</h3>`;

        // Collect all objects with their operations and sources
        // changed_objects now contains only object IDs - look up details from _objects
        const allChangedObjects = transaction.changed_objects.map(objectId => {
            // Find the full object details in _objects
            const obj = transaction._objects.find(o => o.object_id === objectId);

            const objType = this.createTypeWithTooltip(objectId, transaction, 45);
            return {
                objId: objectId,
                version: obj?.version || 'N/A',
                operation: obj?.status || 'Unknown',
                source: obj?.source || 'Runtime',
                objType: objType
            };
        });

        // Use unified table rendering function
        html += this.renderUnifiedObjectTable('object-changes-table', allChangedObjects);
        html += `</div>`;
        container.innerHTML = html;
        this.makeSortable('object-changes-table');
    }

    // Unified table rendering function for objects with version, operation, source, and type columns
    renderUnifiedObjectTable(tableId, objects) {
        let html = `<table id="${tableId}" style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">`;
        html += `<thead><tr style="background: #333;"><th class="object-id-col" style="padding: 10px; text-align: left; color: #4a9eff; border-bottom: 2px solid #4a9eff;">Object ID</th><th class="usage-col" style="padding: 10px; text-align: right; color: #4a9eff; border-bottom: 2px solid #4a9eff;">Version</th><th class="operation-col" style="padding: 10px; text-align: center; color: #4a9eff; border-bottom: 2px solid #4a9eff;">Status</th><th class="owner-col" style="padding: 10px; text-align: center; color: #4a9eff; border-bottom: 2px solid #4a9eff;">Source</th><th class="type-col" style="padding: 10px; text-align: left; color: #4a9eff; border-bottom: 2px solid #4a9eff;">Type</th></tr></thead>`;
        html += `<tbody>`;

        objects.forEach(({ objId, version, operation, source, objType }) => {
            const linkedObj = this.createExplorerLink(objId, 'object');
            const operationColor = operation === 'Created' ? '#87ceeb' : operation === 'Deleted' ? '#ff6b6b' : operation === 'Modified' ? '#dda0dd' : '#ccc';
            const sourceColor = source === 'Input' ? '#90ee90' : source === 'Gas' ? '#ffd700' : '#87ceeb';

            html += `<tr>`;
            html += `<td class="object-id-col" style="padding: 8px; border-bottom: 1px solid #333; color: white; font-family: monospace; vertical-align: top;">${linkedObj}</td>`;
            html += `<td class="usage-col" style="padding: 8px; border-bottom: 1px solid #333; color: white; text-align: right; font-family: monospace; vertical-align: top;">${version}</td>`;
            html += `<td class="operation-col" style="padding: 8px; border-bottom: 1px solid #333; color: ${operationColor}; text-align: center; font-weight: bold; vertical-align: top;">${operation}</td>`;
            html += `<td class="owner-col" style="padding: 8px; border-bottom: 1px solid #333; color: ${sourceColor}; text-align: center; font-weight: bold; vertical-align: top;">${source}</td>`;
            html += `<td class="type-col" style="padding: 8px; border-bottom: 1px solid #333; color: white; font-family: monospace; vertical-align: top;">${objType}</td>`;
            html += `</tr>`;
        });

        html += `</tbody></table>`;
        return html;
    }

    renderGasAnalysis(transaction) {
        const container = document.getElementById('gas-analysis');

        const gasData = transaction.gas_data;
        if (!gasData) {
            container.innerHTML = '<p>Gas data not available</p>';
            return;
        }

        let html = `
            <p style="margin: 0 0 20px 0; color: #ccc; font-style: italic;">
                This section provides detailed gas analysis including gas constants, cost breakdown, and per-object gas usage. It shows exactly how gas was consumed during transaction execution, including storage costs and rebates for each object touched.
            </p>
        `;

        // Gas Constants
        html += `<div class="overview-section">`;
        html += `<h3 class="overview-section-title">Gas Constants</h3>`;
        html += `<div style="display: flex; gap: 30px; font-family: monospace;">`;

        if (gasData.reference_gas_price !== undefined) {
            html += `<span style="color: white;">Reference Gas Price: <span style="color: white;">${this.formatNumber(gasData.reference_gas_price)}</span></span>`;
        }

        if (gasData.storage_gas_price !== undefined) {
            html += `<span style="color: white;">Storage Gas Price: <span style="color: white;">${this.formatNumber(gasData.storage_gas_price)}</span></span>`;
        }

        if (gasData.rebate_rate !== undefined) {
            html += `<span style="color: white;">Rebate Rate: <span style="color: white;">${gasData.rebate_rate / 100}%</span></span>`;
        }

        html += `</div>`;
        html += `</div>`;

        // Gas Summary - transaction specific
        html += `<div class="overview-section">`;
        html += `<h3 class="overview-section-title">Gas Summary</h3>`;
        html += `<table id="gas-summary-table" style="width: 70%; border-collapse: collapse;">`;

        if (gasData.price !== undefined) {
            html += `<tr><td style="padding: 6px 15px; border-bottom: 1px solid #333; color: white;">Gas Price</td><td style="padding: 6px 15px; border-bottom: 1px solid #333; text-align: right; font-family: monospace; color: white;">${this.formatNumber(gasData.price)}</td></tr>`;
        }

        if (gasData.budget !== undefined) {
            html += `<tr><td style="padding: 6px 15px; border-bottom: 1px solid #333; color: white;">Gas Budget</td><td style="padding: 6px 15px; border-bottom: 1px solid #333; text-align: right; font-family: monospace; color: white;">${this.formatNumber(gasData.budget)}</td></tr>`;
        }

        if (gasData.gas_used !== undefined) {
            html += `<tr><td style="padding: 6px 15px; border-bottom: 1px solid #333; color: white;">Gas Used</td><td style="padding: 6px 15px; border-bottom: 1px solid #333; text-align: right; font-family: monospace; color: white;">${this.formatNumber(gasData.gas_used)}</td></tr>`;
        }

        // Line separator after budget/gas used
        html += `<tr><td colspan="2" style="padding: 8px 0; border-top: 1px solid #555;"></td></tr>`;

        if (gasData.computation_cost !== undefined && gasData.storage_cost !== undefined) {
            html += `<tr><td style="padding: 6px 15px; border-bottom: 1px solid #333; color: white;">Computation Cost</td><td style="padding: 6px 15px; border-bottom: 1px solid #333; text-align: right; font-family: monospace; color: white;">${this.formatNumber(gasData.computation_cost)}</td></tr>`;
            html += `<tr><td style="padding: 6px 15px; border-bottom: 1px solid #333; color: white;">Storage Cost</td><td style="padding: 6px 15px; border-bottom: 1px solid #333; text-align: right; font-family: monospace; color: white;">${this.formatNumber(gasData.storage_cost)}</td></tr>`;
            html += `<tr><td style="padding: 6px 15px; border-bottom: 1px solid #333; color: white;">Non-Refundable Storage Fee</td><td style="padding: 6px 15px; border-bottom: 1px solid #333; text-align: right; font-family: monospace; color: white;">${this.formatNumber(gasData.non_refundable_fee)}</td></tr>`;
            html += `<tr><td style="padding: 6px 15px; border-bottom: 1px solid #333; color: white;">Storage Rebate</td><td style="padding: 6px 15px; border-bottom: 1px solid #333; text-align: right; font-family: monospace; color: white;">-${this.formatNumber(gasData.storage_rebate)}</td></tr>`;

            // Line separator before final calculations
            html += `<tr><td colspan="2" style="padding: 8px 0; border-top: 2px solid #777;"></td></tr>`;

            // Calculate gas charges
            const gasCharges = parseInt(gasData.computation_cost) + parseInt(gasData.storage_cost) + parseInt(gasData.non_refundable_fee) - parseInt(gasData.storage_rebate);
            const gasChargesColor = gasCharges >= 0 ? '#ff6b6b' : '#90ee90';
            html += `<tr><td style="padding: 6px 15px; border-bottom: 1px solid #333; color: white;">Gas Charges</td><td style="padding: 6px 15px; border-bottom: 1px solid #333; text-align: right; font-family: monospace; color: ${gasChargesColor};">${this.formatNumber(gasCharges)}</td></tr>`;
        }

        html += `</table>`;
        html += `</div>`;

        // Per-Object Storage Breakdown
        if (gasData.per_object_breakup && gasData.per_object_breakup.length > 0) {
            html += `<div class="overview-section">`;
            html += `<h3 class="overview-section-title">Per-Object Storage Breakdown</h3>`;

            // Categorize objects
            const deletedGasObjects = [];
            const createdGasObjects = [];
            const modifiedGasObjects = [];

            gasData.per_object_breakup.forEach(obj => {
                const storageCost = parseInt(obj.storage_cost || '0');
                const storageRebate = parseInt(obj.storage_rebate || '0');
                const newSize = parseInt(obj.size || '0');

                if (newSize === 0 && storageRebate > 0) {
                    deletedGasObjects.push(obj);
                } else if (storageCost > 0 && storageRebate === 0) {
                    createdGasObjects.push(obj);
                } else {
                    modifiedGasObjects.push(obj);
                }
            });

            // Deleted Objects
            if (deletedGasObjects.length > 0) {
                html += `<h3 style="color: white; margin: 15px 0 10px 0; font-size: 1.1em;">Deleted Objects</h3>`;
                html += `<table id="gas-deleted-objects-table" style="width: 100%; border-collapse: collapse; margin-bottom: 20px; table-layout: fixed;">`;
                html += `<thead><tr style="background: #333;">
        <th style="padding: 10px; text-align: left; color: #4a9eff; border-bottom: 2px solid #4a9eff; font-family: monospace; width: 40%;">Object ID</th>
        <th style="padding: 10px; text-align: left; color: #4a9eff; border-bottom: 2px solid #4a9eff; font-family: monospace; width: 15%;">Type</th>
        <th style="padding: 10px; text-align: right; color: #4a9eff; border-bottom: 2px solid #4a9eff; width: 11%;">Size (bytes)</th>
        <th style="padding: 10px; text-align: right; color: #4a9eff; border-bottom: 2px solid #4a9eff; width: 11%;">Storage Cost</th>
        <th style="padding: 10px; text-align: right; color: #4a9eff; border-bottom: 2px solid #4a9eff; width: 11%;">Non-Refundable</th>
        <th style="padding: 10px; text-align: right; color: #4a9eff; border-bottom: 2px solid #4a9eff; width: 12%;">Storage Rebate</th>
    </tr></thead>`;
                html += `<tbody>`;

                // Calculate totals
                let totalSize = 0, totalStorageCost = 0, totalNonRefundable = 0, totalStorageRebate = 0;

                deletedGasObjects.forEach(obj => {
                    const size = parseInt(obj.size || '0');
                    const storageCost = parseInt(obj.storage_cost || '0');
                    const nonRefundable = parseInt(obj.non_refundable_fee || '0');
                    const rawStorageRebate = parseInt(obj.storage_rebate || '0');
                    // Calculate adjusted storage rebate by subtracting non-refundable from raw rebate
                    const storageRebate = rawStorageRebate - nonRefundable;

                    totalSize += size;
                    totalStorageCost += storageCost;
                    totalNonRefundable += nonRefundable;
                    totalStorageRebate += storageRebate;

                    // Get object type with tooltip and wrapping enabled
                    const objectType = this.createTypeWithTooltip(obj.object_id, transaction, 30);

                    html += `<tr>`;
                    html += `<td style="padding: 8px; border-bottom: 1px solid #333; color: white; font-family: monospace; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; vertical-align: top;" title="${obj.object_id}">${this.createExplorerLink(obj.object_id, 'object')}</td>`;
                    html += `<td style="padding: 8px; border-bottom: 1px solid #333; color: white; font-family: monospace; white-space: normal; vertical-align: top;">${objectType}</td>`;
                    html += `<td style="padding: 8px; border-bottom: 1px solid #333; text-align: right; font-family: monospace; color: white; vertical-align: top;">${this.formatNumber(size)}</td>`;
                    html += `<td style="padding: 8px; border-bottom: 1px solid #333; text-align: right; font-family: monospace; color: white; vertical-align: top;">${this.formatNumber(storageCost)}</td>`;
                    html += `<td style="padding: 8px; border-bottom: 1px solid #333; text-align: right; font-family: monospace; color: white; vertical-align: top;">${this.formatNumber(nonRefundable)}</td>`;
                    html += `<td style="padding: 8px; border-bottom: 1px solid #333; text-align: right; font-family: monospace; color: white; vertical-align: top;">${this.formatNumber(storageRebate)}</td>`;
                    html += `</tr>`;
                });

                // Add separator line and totals row
                html += `<tr><td colspan="6" style="padding: 8px 0; border-top: 2px solid #555;"></td></tr>`;
                html += `<tr style="background: #444; font-weight: bold;">`;
                html += `<td style="padding: 8px; color: #4a9eff;" colspan="2">Total</td>`;
                html += `<td style="padding: 8px; text-align: right; font-family: monospace; color: #4a9eff;">${this.formatNumber(totalSize)}</td>`;
                html += `<td style="padding: 8px; text-align: right; font-family: monospace; color: #4a9eff;">${this.formatNumber(totalStorageCost)}</td>`;
                html += `<td style="padding: 8px; text-align: right; font-family: monospace; color: #ff6b6b;">${this.formatNumber(totalNonRefundable)}</td>`; // Red for non-refundable
                html += `<td style="padding: 8px; text-align: right; font-family: monospace; color: #90ee90;">${this.formatNumber(totalStorageRebate)}</td>`; // Green for rebate
                html += `</tr>`;

                html += `</tbody></table>`;
            }

            // Created Objects
            if (createdGasObjects.length > 0) {
                html += `<h3 style="color: white; margin: 15px 0 10px 0; font-size: 1.1em;">Created Objects</h3>`;
                html += `<table id="gas-created-objects-table" style="width: 100%; border-collapse: collapse; margin-bottom: 20px; table-layout: fixed;">`;
                html += `<thead><tr style="background: #333;">
        <th style="padding: 10px; text-align: left; color: #4a9eff; border-bottom: 2px solid #4a9eff; font-family: monospace; width: 40%;">Object ID</th>
        <th style="padding: 10px; text-align: left; color: #4a9eff; border-bottom: 2px solid #4a9eff; font-family: monospace; width: 15%;">Type</th>
        <th style="padding: 10px; text-align: right; color: #4a9eff; border-bottom: 2px solid #4a9eff; width: 11%;">Size (bytes)</th>
        <th style="padding: 10px; text-align: right; color: #4a9eff; border-bottom: 2px solid #4a9eff; width: 11%;">Storage Cost</th>
        <th style="padding: 10px; text-align: right; color: #4a9eff; border-bottom: 2px solid #4a9eff; width: 11%;">Non-Refundable</th>
        <th style="padding: 10px; text-align: right; color: #4a9eff; border-bottom: 2px solid #4a9eff; width: 12%;">Storage Rebate</th>
    </tr></thead>`;
                html += `<tbody>`;

                // Calculate totals
                let totalSize = 0, totalStorageCost = 0, totalNonRefundable = 0, totalStorageRebate = 0;

                createdGasObjects.forEach(obj => {
                    const size = parseInt(obj.size || '0');
                    const storageCost = parseInt(obj.storage_cost || '0');
                    const nonRefundable = parseInt(obj.non_refundable_fee || '0');
                    const storageRebate = parseInt(obj.storage_rebate || '0');

                    totalSize += size;
                    totalStorageCost += storageCost;
                    totalNonRefundable += nonRefundable;
                    totalStorageRebate += storageRebate;

                    const objectType = this.createTypeWithTooltip(obj.object_id, transaction, 30);

                    html += `<tr>`;
                    html += `<td style="padding: 8px; border-bottom: 1px solid #333; color: white; font-family: monospace; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; vertical-align: top;" title="${obj.object_id}">${this.createExplorerLink(obj.object_id, 'object')}</td>`;
                    html += `<td style="padding: 8px; border-bottom: 1px solid #333; color: white; font-family: monospace; white-space: normal; vertical-align: top;">${objectType}</td>`;
                    html += `<td style="padding: 8px; border-bottom: 1px solid #333; text-align: right; font-family: monospace; color: white; vertical-align: top;">${this.formatNumber(size)}</td>`;
                    html += `<td style="padding: 8px; border-bottom: 1px solid #333; text-align: right; font-family: monospace; color: white; vertical-align: top;">${this.formatNumber(storageCost)}</td>`;
                    html += `<td style="padding: 8px; border-bottom: 1px solid #333; text-align: right; font-family: monospace; color: white; vertical-align: top;">${this.formatNumber(nonRefundable)}</td>`;
                    html += `<td style="padding: 8px; border-bottom: 1px solid #333; text-align: right; font-family: monospace; color: white; vertical-align: top;">${this.formatNumber(storageRebate)}</td>`;
                    html += `</tr>`;
                });

                // Add separator line and totals row
                html += `<tr><td colspan="6" style="padding: 8px 0; border-top: 2px solid #555;"></td></tr>`;
                html += `<tr style="background: #444; font-weight: bold;">`;
                html += `<td style="padding: 8px; color: #4a9eff;" colspan="2">Total</td>`;
                html += `<td style="padding: 8px; text-align: right; font-family: monospace; color: #4a9eff;">${this.formatNumber(totalSize)}</td>`;
                html += `<td style="padding: 8px; text-align: right; font-family: monospace; color: #ff6b6b;">${this.formatNumber(totalStorageCost)}</td>`; // Red for cost
                html += `<td style="padding: 8px; text-align: right; font-family: monospace; color: #4a9eff;">${this.formatNumber(totalNonRefundable)}</td>`;
                html += `<td style="padding: 8px; text-align: right; font-family: monospace; color: #4a9eff;">${this.formatNumber(totalStorageRebate)}</td>`;
                html += `</tr>`;

                html += `</tbody></table>`;
            }

            // Modified Objects
            if (modifiedGasObjects.length > 0) {
                html += `<h3 style="color: white; margin: 15px 0 10px 0; font-size: 1.1em;">Modified Objects</h3>`;
                html += `<table id="gas-modified-objects-table" style="width: 100%; border-collapse: collapse; margin-bottom: 20px; table-layout: fixed;">`;
                html += `<thead><tr style="background: #333;">
        <th style="padding: 10px; text-align: left; color: #4a9eff; border-bottom: 2px solid #4a9eff; font-family: monospace; width: 40%;">Object ID</th>
        <th style="padding: 10px; text-align: left; color: #4a9eff; border-bottom: 2px solid #4a9eff; font-family: monospace; width: 15%;">Type</th>
        <th style="padding: 10px; text-align: right; color: #4a9eff; border-bottom: 2px solid #4a9eff; width: 11%;">Size (bytes)</th>
        <th style="padding: 10px; text-align: right; color: #4a9eff; border-bottom: 2px solid #4a9eff; width: 11%;">Storage Cost</th>
        <th style="padding: 10px; text-align: right; color: #4a9eff; border-bottom: 2px solid #4a9eff; width: 11%;">Non-Refundable</th>
        <th style="padding: 10px; text-align: right; color: #4a9eff; border-bottom: 2px solid #4a9eff; width: 12%;">Storage Rebate</th>
    </tr></thead>`;
                html += `<tbody>`;

                // Calculate totals
                let totalSize = 0, totalStorageCost = 0, totalNonRefundable = 0, totalStorageRebate = 0;

                modifiedGasObjects.forEach(obj => {
                    const size = parseInt(obj.size || '0');
                    const storageCost = parseInt(obj.storage_cost || '0');
                    const nonRefundable = parseInt(obj.non_refundable_fee || '0');
                    const rawStorageRebate = parseInt(obj.storage_rebate || '0');
                    // Calculate adjusted storage rebate by subtracting non-refundable from raw rebate
                    const storageRebate = rawStorageRebate - nonRefundable;

                    totalSize += size;
                    totalStorageCost += storageCost;
                    totalNonRefundable += nonRefundable;
                    totalStorageRebate += storageRebate;

                    const objectType = this.createTypeWithTooltip(obj.object_id, transaction, 30);

                    html += `<tr>`;
                    html += `<td style="padding: 8px; border-bottom: 1px solid #333; color: white; font-family: monospace; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; vertical-align: top;" title="${obj.object_id}">${this.createExplorerLink(obj.object_id, 'object')}</td>`;
                    html += `<td style="padding: 8px; border-bottom: 1px solid #333; color: white; font-family: monospace; white-space: normal; vertical-align: top;">${objectType}</td>`;
                    html += `<td style="padding: 8px; border-bottom: 1px solid #333; text-align: right; font-family: monospace; color: white; vertical-align: top;">${this.formatNumber(size)}</td>`;
                    html += `<td style="padding: 8px; border-bottom: 1px solid #333; text-align: right; font-family: monospace; color: white; vertical-align: top;">${this.formatNumber(storageCost)}</td>`;
                    html += `<td style="padding: 8px; border-bottom: 1px solid #333; text-align: right; font-family: monospace; color: white; vertical-align: top;">${this.formatNumber(nonRefundable)}</td>`;
                    html += `<td style="padding: 8px; border-bottom: 1px solid #333; text-align: right; font-family: monospace; color: white; vertical-align: top;">${this.formatNumber(storageRebate)}</td>`;
                    html += `</tr>`;
                });

                // Add separator line and totals row
                html += `<tr><td colspan="6" style="padding: 8px 0; border-top: 2px solid #555;"></td></tr>`;
                html += `<tr style="background: #444; font-weight: bold;">`;
                html += `<td style="padding: 8px; color: #4a9eff;" colspan="2">Total</td>`;
                html += `<td style="padding: 8px; text-align: right; font-family: monospace; color: #4a9eff;">${this.formatNumber(totalSize)}</td>`;
                html += `<td style="padding: 8px; text-align: right; font-family: monospace; color: #ff6b6b;">${this.formatNumber(totalStorageCost)}</td>`; // Red for cost
                html += `<td style="padding: 8px; text-align: right; font-family: monospace; color: #ff6b6b;">${this.formatNumber(totalNonRefundable)}</td>`; // Red for non-refundable
                html += `<td style="padding: 8px; text-align: right; font-family: monospace; color: #90ee90;">${this.formatNumber(totalStorageRebate)}</td>`; // Green for rebate
                html += `</tr>`;

                html += `</tbody></table>`;

                // Calculate and add grand total row to appear as part of the last table
                if ((deletedGasObjects.length > 0) || (createdGasObjects.length > 0) || (modifiedGasObjects.length > 0)) {
                    let grandTotalStorageCost = 0, grandTotalNonRefundable = 0, grandTotalStorageRebate = 0;

                    // Add totals from deleted objects
                    if (deletedGasObjects.length > 0) {
                        deletedGasObjects.forEach(obj => {
                            const storageCost = parseInt(obj.storage_cost || '0');
                            const nonRefundable = parseInt(obj.non_refundable_fee || '0');
                            const rawStorageRebate = parseInt(obj.storage_rebate || '0');
                            const storageRebate = rawStorageRebate - nonRefundable;

                            grandTotalStorageCost += storageCost;
                            grandTotalNonRefundable += nonRefundable;
                            grandTotalStorageRebate += storageRebate;
                        });
                    }

                    // Add totals from created objects
                    if (createdGasObjects.length > 0) {
                        createdGasObjects.forEach(obj => {
                            const storageCost = parseInt(obj.storage_cost || '0');
                            const nonRefundable = parseInt(obj.non_refundable_fee || '0');
                            const storageRebate = parseInt(obj.storage_rebate || '0');

                            grandTotalStorageCost += storageCost;
                            grandTotalNonRefundable += nonRefundable;
                            grandTotalStorageRebate += storageRebate;
                        });
                    }

                    // Add totals from modified objects
                    if (modifiedGasObjects.length > 0) {
                        modifiedGasObjects.forEach(obj => {
                            const storageCost = parseInt(obj.storage_cost || '0');
                            const nonRefundable = parseInt(obj.non_refundable_fee || '0');
                            const rawStorageRebate = parseInt(obj.storage_rebate || '0');
                            const storageRebate = rawStorageRebate - nonRefundable;

                            grandTotalStorageCost += storageCost;
                            grandTotalNonRefundable += nonRefundable;
                            grandTotalStorageRebate += storageRebate;
                        });
                    }

                    // Calculate grand total size for completeness
                    let grandTotalSize = 0;

                    // Add size totals from all tables
                    if (deletedGasObjects.length > 0) {
                        deletedGasObjects.forEach(obj => {
                            grandTotalSize += parseInt(obj.size || '0');
                        });
                    }
                    if (createdGasObjects.length > 0) {
                        createdGasObjects.forEach(obj => {
                            grandTotalSize += parseInt(obj.size || '0');
                        });
                    }
                    if (modifiedGasObjects.length > 0) {
                        modifiedGasObjects.forEach(obj => {
                            grandTotalSize += parseInt(obj.size || '0');
                        });
                    }

                    // Add grand total table with identical structure to tables above
                    html += `<table style="width: 100%; border-collapse: collapse; margin-top: 0; margin-bottom: 20px; table-layout: fixed;">`;
                    html += `<thead><tr style="background: #333;">
        <th style="padding: 10px; text-align: left; color: #4a9eff; border-bottom: 2px solid #4a9eff; font-family: monospace; width: 55%;"></th>
        <th style="padding: 10px; text-align: right; color: #4a9eff; border-bottom: 2px solid #4a9eff; width: 11%;">Size (bytes)</th>
        <th style="padding: 10px; text-align: right; color: #4a9eff; border-bottom: 2px solid #4a9eff; width: 11%;">Storage Cost</th>
        <th style="padding: 10px; text-align: right; color: #4a9eff; border-bottom: 2px solid #4a9eff; width: 11%;">Non-Refundable</th>
        <th style="padding: 10px; text-align: right; color: #4a9eff; border-bottom: 2px solid #4a9eff; width: 12%;">Storage Rebate</th>
    </tr></thead>`;
                    html += `<tbody>`;
                    html += `<tr style="background: #444; font-weight: bold;">`;
                    html += `<td style="padding: 8px; border-bottom: 1px solid #333; color: #4a9eff; font-weight: bold; font-family: monospace;">TOTAL</td>`;
                    html += `<td style="padding: 8px; border-bottom: 1px solid #333; text-align: right; font-family: monospace; color: #4a9eff; font-weight: bold;">${this.formatNumber(grandTotalSize)}</td>`;
                    html += `<td style="padding: 8px; border-bottom: 1px solid #333; text-align: right; font-family: monospace; color: #ff6b6b; font-weight: bold;">${this.formatNumber(grandTotalStorageCost)}</td>`;
                    html += `<td style="padding: 8px; border-bottom: 1px solid #333; text-align: right; font-family: monospace; color: #ff6b6b; font-weight: bold;">${this.formatNumber(grandTotalNonRefundable)}</td>`;
                    html += `<td style="padding: 8px; border-bottom: 1px solid #333; text-align: right; font-family: monospace; color: #90ee90; font-weight: bold;">${this.formatNumber(grandTotalStorageRebate)}</td>`;
                    html += `</tr>`;
                    html += `</tbody></table>`;
                }
            }

            html += `</div>`;
        }

        container.innerHTML = html;
        this.makeSortable('gas-deleted-objects-table');
        this.makeSortable('gas-created-objects-table');
        this.makeSortable('gas-modified-objects-table');
    }

    renderRawJson(transaction) {
        const container = document.getElementById('raw-json');

        let html = `
            <p style="margin: 0 0 20px 0; color: #ccc; font-style: italic;">
                This section displays the raw JSON files loaded from the replay directory. These are the original artifacts generated by the sui-replay-2 tool.
            </p>
            <div style="margin-bottom: 20px; color: #999; font-size: 0.9em;">
                <span id="expand-all-json" style="color: #4a9eff; cursor: pointer; text-decoration: underline; margin-right: 15px;">Expand All</span>
                <span id="collapse-all-json" style="color: #4a9eff; cursor: pointer; text-decoration: underline;">Collapse All</span>
            </div>
        `;

        const jsonFiles = [
            {
                name: 'transaction_data.json',
                description: 'Transaction structure, inputs, and commands',
                data: transaction._rawData.transaction_data
            },
            {
                name: 'transaction_effects.json',
                description: 'Execution results and state changes',
                data: transaction._rawData.transaction_effects
            },
            {
                name: 'transaction_gas_report.json',
                description: 'Gas usage breakdown',
                data: transaction._rawData.transaction_gas_report
            },
            {
                name: 'replay_cache_summary.json',
                description: 'Cached objects and packages',
                data: transaction._rawData.replay_cache_summary
            },
            {
                name: 'move_call_info.json',
                description: 'Programmable Transaction Block details',
                data: transaction._rawData.move_call_info
            }
        ];

        jsonFiles.forEach(file => {
            if (file.data) {
                html += `
                    <div class="overview-section" style="margin-bottom: 30px;">
                        <h3 class="overview-section-title">${file.name}</h3>
                        <p style="margin: 5px 0 10px 0; color: #999; font-style: italic; font-size: 0.9em;">
                            ${file.description}
                        </p>
                        <div style="background: #1a1a1a; padding: 15px; border-radius: 5px; overflow-x: auto; color: #e0e0e0; font-family: 'Courier New', monospace; font-size: 1.15em; line-height: 1.6; border: 1px solid #333;">
                            ${this.renderCollapsibleJson(file.data, 0)}
                        </div>
                    </div>
                `;
            }
        });

        container.innerHTML = html;

        // Add event listeners for expand/collapse all buttons
        document.getElementById('expand-all-json')?.addEventListener('click', () => {
            container.querySelectorAll('details').forEach(d => d.open = true);
        });
        document.getElementById('collapse-all-json')?.addEventListener('click', () => {
            container.querySelectorAll('details').forEach(d => d.open = false);
        });
    }

    renderCollapsibleJson(data, depth = 0) {
        const indent = '  '.repeat(depth);
        const maxStringLength = 80;

        if (data === null) {
            return '<span style="color: #999;">null</span>';
        }

        if (typeof data === 'boolean') {
            return `<span style="color: #e0e0e0;">${data}</span>`;
        }

        if (typeof data === 'number') {
            return `<span style="color: #e0e0e0;">${data}</span>`;
        }

        if (typeof data === 'string') {
            const escaped = this.escapeHtml(data);
            if (escaped.length > maxStringLength) {
                const truncated = escaped.substring(0, maxStringLength);
                return `<span style="color: #e0e0e0;">"${truncated}..."</span>`;
            }
            return `<span style="color: #e0e0e0;">"${escaped}"</span>`;
        }

        if (Array.isArray(data)) {
            if (data.length === 0) {
                return '<span style="color: #e0e0e0;">[]</span>';
            }

            const openAttr = depth === 0 ? ' open' : '';
            let html = `<details style="display: inline;"${openAttr}><summary style="cursor: pointer; color: #4a9eff; list-style: none;">`;
            html += `▶ Array[${data.length}]</summary>`;
            html += '<div style="margin-left: 20px;">';

            data.forEach((item, index) => {
                html += `<div style="margin: 2px 0;">`;
                html += `<span style="color: #888;">${index}:</span> `;
                html += this.renderCollapsibleJson(item, depth + 1);
                if (index < data.length - 1) html += '<span style="color: #666;">,</span>';
                html += `</div>`;
            });

            html += '</div></details>';
            return html;
        }

        if (typeof data === 'object') {
            const keys = Object.keys(data);
            if (keys.length === 0) {
                return '<span style="color: #e0e0e0;">{}</span>';
            }

            const openAttr = depth === 0 ? ' open' : '';
            let html = `<details style="display: inline;"${openAttr}><summary style="cursor: pointer; color: #4a9eff; list-style: none;">`;
            html += `▶ Object{${keys.length}}</summary>`;
            html += '<div style="margin-left: 20px;">';

            keys.forEach((key, index) => {
                html += `<div style="margin: 2px 0;">`;
                html += `<span style="color: #87ceeb;">"${this.escapeHtml(key)}"</span>: `;
                html += this.renderCollapsibleJson(data[key], depth + 1);
                if (index < keys.length - 1) html += '<span style="color: #666;">,</span>';
                html += `</div>`;
            });

            html += '</div></details>';
            return html;
        }

        return '<span style="color: #e0e0e0;">undefined</span>';
    }

    formatOwner(owner) {
        if (typeof owner === 'string') {
            return this.createExplorerLink(owner, 'account');
        } else if (owner && owner.AddressOwner) {
            return this.createExplorerLink(owner.AddressOwner, 'account');
        } else if (owner && owner.ObjectOwner) {
            return this.createExplorerLink(owner.ObjectOwner, 'object');
        } else if (owner === 'Immutable') {
            return 'Immutable';
        } else if (owner && owner.Shared) {
            return `Shared (initial_shared_version: ${owner.Shared.initial_shared_version})`;
        }
        return JSON.stringify(owner);
    }

    escapeHtml(text) {
        // Use the more comprehensive HTML encoding method
        return this.encodeHTML(text);
    }

    showError(message) {
        document.getElementById('error-message').textContent = message;

        // Create error tab if it doesn't exist
        const tabNav = document.getElementById('tab-nav');
        if (!document.querySelector('[data-tab="error"]')) {
            const errorTab = document.createElement('button');
            errorTab.className = 'tab-btn';
            errorTab.setAttribute('data-tab', 'error');
            errorTab.textContent = 'Error';
            errorTab.style.color = '#ff6b6b';
            tabNav.appendChild(errorTab);
        }

        // Switch to error tab
        this.switchToTab('error');
    }

    hideError() {
        // Remove error tab if it exists
        const errorTab = document.querySelector('[data-tab="error"]');
        if (errorTab) {
            errorTab.remove();
        }
    }

    /**
     * Format a type from move call details into a display string with nested tooltips
     * Redirects to unified formatter
     */
    formatTypeFromPTB(typeObj, cacheDataOrTransaction = null) {
        return this.formatTypeUnified(typeObj, cacheDataOrTransaction);
    }

    /**
     * Convert move call type object to simple string (no HTML)
     */
    ptbTypeToString(typeObj) {
        if (!typeObj) return 'unknown';

        // Handle primitive types (string variants) - normalize to lowercase
        if (typeof typeObj === 'string') {
            const primitives = {
                'Bool': 'bool',
                'U8': 'u8',
                'U16': 'u16',
                'U32': 'u32',
                'U64': 'u64',
                'U128': 'u128',
                'U256': 'u256',
                'Address': 'address'
            };
            if (primitives[typeObj]) {
                return primitives[typeObj];
            }
            // Also handle lowercase versions
            const lower = typeObj.toLowerCase();
            if (['bool', 'u8', 'u16', 'u32', 'u64', 'u128', 'u256', 'address'].includes(lower)) {
                return lower;
            }
            return typeObj.toLowerCase();
        }

        // Handle Vector type
        if (typeObj.Vector) {
            const elementTypeString = this.ptbTypeToString(typeObj.Vector);
            return `vector<${elementTypeString}>`;
        }

        // Handle Datatype (simple struct without type parameters)
        if (typeObj.Datatype) {
            const [address, module, name, _typeParams] = typeObj.Datatype;
            const pkg = address.startsWith('0x') ? address : `0x${address}`;
            return `${pkg}::${module}::${name}`;
        }

        // Handle DatatypeInstantiation (struct with type parameters)
        if (typeObj.DatatypeInstantiation) {
            const [[address, module, name, _typeParams], typeArgs] = typeObj.DatatypeInstantiation;
            const pkg = address.startsWith('0x') ? address : `0x${address}`;
            let typeString = `${pkg}::${module}::${name}`;

            if (typeArgs && typeArgs.length > 0) {
                const formattedArgs = typeArgs.map(arg => this.ptbTypeToString(arg));
                typeString += `<${formattedArgs.join(', ')}>`;
            }

            return typeString;
        }

        // Handle Reference type
        if (typeObj.Reference) {
            const innerType = this.ptbTypeToString(typeObj.Reference);
            return `&${innerType}`;
        }

        // Handle MutableReference type
        if (typeObj.MutableReference) {
            const innerType = this.ptbTypeToString(typeObj.MutableReference);
            return `&mut ${innerType}`;
        }

        // Handle TypeParameter
        if (typeObj.TypeParameter !== undefined) {
            return `T${typeObj.TypeParameter}`;
        }

        // Fallback for unknown types
        return JSON.stringify(typeObj);
    }

    /**
     * Format argument without type information (for move call details integration)
     */
    formatArgumentWithoutType(argument) {
        // Handle case where argument is just the string "GasCoin"
        if (argument === "GasCoin") {
            return "gas_coin";
        } else if (argument.GasCoin !== undefined) {
            return "gas_coin";
        } else if (argument.Input !== undefined) {
            const inputIndex = argument.Input;
            return `Input_${inputIndex}`;
        } else if (argument.Result !== undefined) {
            const cmdIndex = argument.Result;
            return `Cmd_${cmdIndex}`;
        } else if (argument.NestedResult !== undefined) {
            const [cmdIndex, resultIndex] = argument.NestedResult;
            return `Cmd_${cmdIndex}.${resultIndex}`;
        } else {
            return JSON.stringify(argument);
        }
    }

}

// Initialize the viewer when page loads
document.addEventListener('DOMContentLoaded', () => {
    new TransactionViewer();
});