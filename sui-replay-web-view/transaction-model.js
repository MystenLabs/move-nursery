/**
 * Transaction Model
 *
 * Unified object model that abstracts the underlying JSON file structures
 * (move_call_info.json, replay_cache_summary.json, transaction_data.json,
 * transaction_effects.json, transaction_gas_report.json).
 *
 * This provides a cohesive, well-defined API for accessing transaction data.
 */

/**
 * MoveType - Represents a Move type with full package information
 */
class MoveType {
    constructor(packageAddr, module, name, typeArgs = [], isPrimitive = false) {
        this.package = packageAddr;
        this.module = module;
        this.name = name;
        this.typeArgs = typeArgs; // Array of MoveType
        this.isPrimitive = isPrimitive;
    }

    /**
     * Display format: module::Type<TypeArg1, TypeArg2>
     */
    toDisplayString() {
        if (this.isPrimitive) {
            // Primitives with type args (like vector<T>) still need to show type args
            if (this.typeArgs.length > 0) {
                const args = this.typeArgs.map(t => t.toDisplayString()).join(', ');
                return `${this.name}<${args}>`;
            }
            return this.name;
        }

        let result = `${this.module}::${this.name}`;
        if (this.typeArgs.length > 0) {
            const args = this.typeArgs.map(t => t.toDisplayString()).join(', ');
            result += `<${args}>`;
        }
        return result;
    }

    /**
     * Fully qualified format: 0xPackage::module::Type<TypeArg1, TypeArg2>
     */
    toFullyQualifiedString() {
        if (this.isPrimitive) {
            // Primitives with type args (like vector<T>) still need to show type args
            if (this.typeArgs.length > 0) {
                const args = this.typeArgs.map(t => t.toFullyQualifiedString()).join(', ');
                return `${this.name}<${args}>`;
            }
            return this.name;
        }

        // Handle types without package (shouldn't happen for non-primitives, but be defensive)
        if (!this.package) {
            let result = `${this.module}::${this.name}`;
            if (this.typeArgs.length > 0) {
                const args = this.typeArgs.map(t => t.toFullyQualifiedString()).join(', ');
                result += `<${args}>`;
            }
            return result;
        }

        const pkg = this.package.startsWith('0x') ? this.package : `0x${this.package}`;
        let result = `${pkg}::${this.module}::${this.name}`;
        if (this.typeArgs.length > 0) {
            const args = this.typeArgs.map(t => t.toFullyQualifiedString()).join(', ');
            result += `<${args}>`;
        }
        return result;
    }

    /**
     * HTML format with tooltips - display shows short form, tooltip shows full qualified
     */
    toHTML() {
        // Handle references
        let prefix = '';
        if (this._isMutableReference) {
            prefix = '&amp;mut ';
        } else if (this._isReference) {
            prefix = '&amp;';
        }

        if (this.isPrimitive) {
            // Primitives with type args (like vector<T>) still need HTML formatting
            if (this.typeArgs.length > 0) {
                let html = prefix + this.name + '&lt;';
                html += this.typeArgs.map(t => t.toHTML()).join(', ');
                html += '&gt;';
                return html;
            }
            return prefix + this.name;
        }

        const displayName = `${this.module}::${this.name}`;
        const fullQualified = this.toFullyQualifiedString();

        let html = prefix + `<span class="custom-tooltip" data-tooltip="${fullQualified}" style="cursor: help; text-decoration: underline dotted; color: #87ceeb;">${displayName}</span>`;

        if (this.typeArgs.length > 0) {
            html += '&lt;';
            html += this.typeArgs.map(t => t.toHTML()).join(', ');
            html += '&gt;';
        }

        return html;
    }

    /**
     * Parse a type structure from transaction data into a MoveType
     */
    static fromTypeStructure(typeObj, cacheData = null) {
        // Handle primitives - all Move primitive types
        const primitives = {
            'Bool': 'bool',
            'U8': 'u8', 'U16': 'u16', 'U32': 'u32',
            'U64': 'u64', 'U128': 'u128', 'U256': 'u256',
            'Address': 'address',
            'Signer': 'signer'
        };

        if (typeof typeObj === 'string' && primitives[typeObj]) {
            return new MoveType(null, null, primitives[typeObj], [], true);
        }

        // Handle object with primitive key
        if (typeof typeObj === 'object' && typeObj !== null) {
            for (const [key, value] of Object.entries(typeObj)) {
                if (primitives[key]) {
                    return new MoveType(null, null, primitives[key], [], true);
                }
            }

            // Handle Vector - it's a built-in generic type
            if (typeObj.Vector) {
                const innerType = MoveType.fromTypeStructure(typeObj.Vector, cacheData);
                // Vector is a built-in type, mark as primitive but keep typeArgs for the inner type
                return new MoveType(null, 'vector', 'vector', [innerType], true);
            }

            // Handle Reference
            if (typeObj.Reference) {
                const innerType = MoveType.fromTypeStructure(typeObj.Reference, cacheData);
                // Prepend & to the display
                const refType = new MoveType(innerType.package, innerType.module, innerType.name, innerType.typeArgs, innerType.isPrimitive);
                refType._isReference = true;
                return refType;
            }

            // Handle MutableReference
            if (typeObj.MutableReference) {
                const innerType = MoveType.fromTypeStructure(typeObj.MutableReference, cacheData);
                const refType = new MoveType(innerType.package, innerType.module, innerType.name, innerType.typeArgs, innerType.isPrimitive);
                refType._isMutableReference = true;
                return refType;
            }

            // Handle lowercase struct format (from type_arguments in commands)
            // Format: {struct: {address, module, name, type_args}}
            if (typeObj.struct) {
                const {address: packageAddr, module, name, type_args} = typeObj.struct;
                const normalizedPkg = packageAddr.startsWith('0x') ? packageAddr.slice(2) : packageAddr;

                // Parse type_args if present
                if (type_args && type_args.length > 0) {
                    const parsedTypeArgs = type_args.map(arg => MoveType.fromTypeStructure(arg, cacheData));
                    return new MoveType(normalizedPkg, module, name, parsedTypeArgs, false);
                }

                return new MoveType(normalizedPkg, module, name, [], false);
            }

            // Handle Struct (package::module::name without type args)
            // Format: {Struct: [[address, module, name, typeParams]]}
            if (typeObj.Struct) {
                const [[packageAddr, module, name, _typeParams]] = typeObj.Struct;
                const normalizedPkg = packageAddr.startsWith('0x') ? packageAddr.slice(2) : packageAddr;
                return new MoveType(normalizedPkg, module, name, [], false);
            }

            // Handle DatatypeInstantiation (struct with type args)
            // Format: {DatatypeInstantiation: [[address, module, name, typeParams], typeArgs]}
            if (typeObj.DatatypeInstantiation) {
                const [[packageAddr, module, name, _typeParams], typeArgs] = typeObj.DatatypeInstantiation;
                const normalizedPkg = packageAddr.startsWith('0x') ? packageAddr.slice(2) : packageAddr;
                const parsedTypeArgs = typeArgs.map(arg => MoveType.fromTypeStructure(arg, cacheData));
                return new MoveType(normalizedPkg, module, name, parsedTypeArgs, false);
            }

            // Handle Datatype (package::module::name without type args - from move_call_info)
            // Format: {Datatype: [address, module, name, typeParams]}
            if (typeObj.Datatype) {
                const [packageAddr, module, name, _typeParams] = typeObj.Datatype;
                const normalizedPkg = packageAddr.startsWith('0x') ? packageAddr.slice(2) : packageAddr;
                return new MoveType(normalizedPkg, module, name, [], false);
            }

            // Handle direct object format (from replay_cache_summary MoveObject)
            // Format: {address, module, name, type_args}
            if (typeObj.address && typeObj.module && typeObj.name) {
                const packageAddr = typeObj.address;
                const module = typeObj.module;
                const name = typeObj.name;
                const type_args = typeObj.type_args || [];
                const normalizedPkg = packageAddr.startsWith('0x') ? packageAddr.slice(2) : packageAddr;

                if (type_args.length > 0) {
                    const parsedTypeArgs = type_args.map(arg => MoveType.fromTypeStructure(arg, cacheData));
                    return new MoveType(normalizedPkg, module, name, parsedTypeArgs, false);
                }

                return new MoveType(normalizedPkg, module, name, [], false);
            }
        }

        // Fallback - return unknown
        return new MoveType(null, 'unknown', 'unknown', [], false);
    }
}

/**
 * MoveFunction - Represents a Move function call
 */
class MoveFunction {
    constructor(packageAddr, module, name, typeArgs = []) {
        this.package = packageAddr;
        this.module = module;
        this.name = name;
        this.typeArgs = typeArgs; // Array of MoveType
    }

    /**
     * Display format: module::function<TypeArg1, TypeArg2>
     */
    toDisplayString() {
        let result = `${this.module}::${this.name}`;
        if (this.typeArgs.length > 0) {
            const args = this.typeArgs.map(t => t.toDisplayString()).join(', ');
            result += `<${args}>`;
        }
        return result;
    }

    /**
     * Fully qualified format: 0xPackage::module::function<TypeArg1, TypeArg2>
     */
    toFullyQualifiedString() {
        // Handle functions without package (shouldn't happen, but be defensive)
        if (!this.package) {
            let result = `${this.module}::${this.name}`;
            if (this.typeArgs.length > 0) {
                const args = this.typeArgs.map(t => t.toFullyQualifiedString()).join(', ');
                result += `<${args}>`;
            }
            return result;
        }

        const pkg = this.package.startsWith('0x') ? this.package : `0x${this.package}`;
        let result = `${pkg}::${this.module}::${this.name}`;
        if (this.typeArgs.length > 0) {
            const args = this.typeArgs.map(t => t.toFullyQualifiedString()).join(', ');
            result += `<${args}>`;
        }
        return result;
    }

    /**
     * HTML format with tooltips
     */
    toHTML() {
        const displayName = `${this.module}::${this.name}`;
        const fullQualified = this.toFullyQualifiedString();

        let html = `<span class="custom-tooltip" data-tooltip="${fullQualified}" style="cursor: help; text-decoration: underline dotted; color: #87ceeb;">${displayName}</span>`;

        if (this.typeArgs.length > 0) {
            html += '&lt;';
            html += this.typeArgs.map(t => t.toHTML()).join(', ');
            html += '&gt;';
        }

        return html;
    }
}

/**
 * Command - Base class for PTB commands
 */
class Command {
    constructor(typeArgs = []) {
        this.typeArgs = typeArgs; // Array of MoveType - many commands don't have type args but some do
    }

    /**
     * Get the command type name (e.g., "MoveCall", "SplitCoins")
     */
    getTypeName() {
        throw new Error('getTypeName() must be implemented by subclass');
    }

    /**
     * Get display string for the command
     */
    toDisplayString() {
        throw new Error('toDisplayString() must be implemented by subclass');
    }
}

/**
 * MoveCallCommand - Represents a MoveCall command
 */
class MoveCallCommand extends Command {
    constructor(moveFunction, signature = null) {
        super(moveFunction.typeArgs);
        this.function = moveFunction; // MoveFunction instance
        this.signature = signature; // Optional signature from move_call_info
    }

    getTypeName() {
        return 'MoveCall';
    }

    toDisplayString() {
        return this.function.toDisplayString();
    }

    /**
     * Parse from raw command structure
     */
    static fromRawCommand(rawCmd, transaction) {
        const mc = rawCmd.MoveCall;
        const packageAddr = mc.package;
        const module = mc.module;
        const name = mc.function;

        // Parse type arguments
        const typeArgs = (mc.type_arguments || []).map(typeArg =>
            MoveType.fromTypeStructure(typeArg, transaction)
        );

        const moveFunction = new MoveFunction(packageAddr, module, name, typeArgs);
        return new MoveCallCommand(moveFunction, rawCmd._signature);
    }
}

/**
 * TransferObjectsCommand - Represents a TransferObjects command
 */
class TransferObjectsCommand extends Command {
    constructor(objects, address) {
        super([]);
        this.objects = objects; // Array of argument references
        this.address = address; // Argument reference
    }

    getTypeName() {
        return 'TransferObjects';
    }

    toDisplayString() {
        return 'TransferObjects';
    }

    static fromRawCommand(rawCmd) {
        const [objects, address] = rawCmd.TransferObjects;
        return new TransferObjectsCommand(objects, address);
    }
}

/**
 * SplitCoinsCommand - Represents a SplitCoins command with type information
 */
class SplitCoinsCommand extends Command {
    constructor(coin, amounts, coinType = null) {
        super(coinType ? [coinType] : []);
        this.coin = coin; // Argument reference
        this.amounts = amounts; // Array of argument references
        this.coinType = coinType; // MoveType instance for Coin<T>
    }

    getTypeName() {
        return 'SplitCoins';
    }

    toDisplayString() {
        if (this.coinType) {
            return `SplitCoins<${this.coinType.toDisplayString()}>`;
        }
        return 'SplitCoins<T>';
    }

    static fromRawCommand(rawCmd, transaction, inputs) {
        const [coin, amounts] = rawCmd.SplitCoins;

        let coinType = null;

        // Try to determine coin type from the coin argument
        if (coin.Input !== undefined && inputs && inputs[coin.Input] && inputs[coin.Input].Object) {
            const objectArg = inputs[coin.Input].Object;
            let objectId = null;

            if (objectArg.ImmOrOwnedObject) {
                objectId = objectArg.ImmOrOwnedObject[0];
            } else if (objectArg.SharedObject) {
                objectId = objectArg.SharedObject.id;
            } else if (objectArg.Receiving) {
                objectId = objectArg.Receiving[0];
            }

            if (objectId) {
                coinType = transaction.getObjectMoveType(objectId);
            }
        } else if (coin === "GasCoin" || (coin.GasCoin !== undefined)) {
            // GasCoin is always Coin<SUI>
            const suiType = new MoveType('0000000000000000000000000000000000000000000000000000000000000002', 'sui', 'SUI', [], false);
            coinType = new MoveType('0000000000000000000000000000000000000000000000000000000000000002', 'coin', 'Coin', [suiType], false);
        }

        return new SplitCoinsCommand(coin, amounts, coinType);
    }
}

/**
 * MergeCoinsCommand - Represents a MergeCoins command with type information
 */
class MergeCoinsCommand extends Command {
    constructor(target, sources, coinType = null) {
        super(coinType ? [coinType] : []);
        this.target = target; // Argument reference
        this.sources = sources; // Array of argument references
        this.coinType = coinType; // MoveType instance for Coin<T>
    }

    getTypeName() {
        return 'MergeCoins';
    }

    toDisplayString() {
        if (this.coinType) {
            return `MergeCoins<${this.coinType.toDisplayString()}>`;
        }
        return 'MergeCoins<T>';
    }

    static fromRawCommand(rawCmd, transaction, inputs) {
        const [target, sources] = rawCmd.MergeCoins;

        let coinType = null;

        // Try to determine coin type from the target argument
        if (target.Input !== undefined && inputs && inputs[target.Input] && inputs[target.Input].Object) {
            const objectArg = inputs[target.Input].Object;
            let objectId = null;

            if (objectArg.ImmOrOwnedObject) {
                objectId = objectArg.ImmOrOwnedObject[0];
            } else if (objectArg.SharedObject) {
                objectId = objectArg.SharedObject.id;
            } else if (objectArg.Receiving) {
                objectId = objectArg.Receiving[0];
            }

            if (objectId) {
                coinType = transaction.getObjectMoveType(objectId);
            }
        } else if (target === "GasCoin" || (target.GasCoin !== undefined)) {
            // GasCoin is always Coin<SUI>
            const suiType = new MoveType('0000000000000000000000000000000000000000000000000000000000000002', 'sui', 'SUI', [], false);
            coinType = new MoveType('0000000000000000000000000000000000000000000000000000000000000002', 'coin', 'Coin', [suiType], false);
        }

        return new MergeCoinsCommand(target, sources, coinType);
    }
}

/**
 * MakeMoveVecCommand - Represents a MakeMoveVec command with type information
 */
class MakeMoveVecCommand extends Command {
    constructor(elements, elementType = null) {
        super(elementType ? [elementType] : []);
        this.elements = elements; // Array of argument references
        this.elementType = elementType; // MoveType instance
    }

    getTypeName() {
        return 'MakeMoveVec';
    }

    toDisplayString() {
        if (this.elementType) {
            return `MakeMoveVec<${this.elementType.toDisplayString()}>`;
        }
        return 'MakeMoveVec<T>';
    }

    static fromRawCommand(rawCmd, transaction, inputs, rawCommands) {
        const [typeArg, elements] = rawCmd.MakeMoveVec;

        let elementType = null;
        if (typeArg) {
            elementType = MoveType.fromTypeStructure(typeArg, transaction);
        } else if (elements && elements.length > 0) {
            // Type not specified - infer from first element
            const firstElem = elements[0];

            // Handle Result reference
            if (firstElem.Result !== undefined && rawCommands) {
                const cmdIndex = firstElem.Result;
                elementType = MakeMoveVecCommand._inferTypeFromCommand(rawCommands[cmdIndex], 0, transaction, inputs);
            }
            // Handle NestedResult reference
            else if (firstElem.NestedResult !== undefined && rawCommands) {
                const [cmdIndex, resultIndex] = firstElem.NestedResult;
                elementType = MakeMoveVecCommand._inferTypeFromCommand(rawCommands[cmdIndex], resultIndex, transaction, inputs);
            }
        }

        return new MakeMoveVecCommand(elements, elementType);
    }

    /**
     * Helper to infer type from a command's return value
     */
    static _inferTypeFromCommand(previousCmd, resultIndex, transaction, inputs) {
        if (!previousCmd) return null;

        // Handle MoveCall
        if (previousCmd.MoveCall) {
            if (previousCmd._signature && previousCmd._signature.return_types) {
                const returnTypes = previousCmd._signature.return_types;
                if (resultIndex < returnTypes.length) {
                    return MoveType.fromTypeStructure(returnTypes[resultIndex], transaction);
                }
            }
        }
        // Handle SplitCoins - returns array of Coin<T>
        else if (previousCmd.SplitCoins) {
            const parsedCmd = SplitCoinsCommand.fromRawCommand(previousCmd, transaction, inputs);
            return parsedCmd.coinType;
        }
        // Handle MergeCoins - returns void, but shouldn't be referenced
        // Handle MakeMoveVec - returns vector<T>
        else if (previousCmd.MakeMoveVec) {
            const parsedCmd = MakeMoveVecCommand.fromRawCommand(previousCmd, transaction, inputs, null);
            if (parsedCmd.elementType) {
                // Return the element type wrapped in a vector
                return new MoveType(null, 'vector', 'vector', [parsedCmd.elementType], true);
            }
        }

        return null;
    }
}

/**
 * PublishCommand - Represents a Publish command
 */
class PublishCommand extends Command {
    constructor(modules, deps) {
        super([]);
        this.modules = modules;
        this.deps = deps;
    }

    getTypeName() {
        return 'Publish';
    }

    toDisplayString() {
        return 'Publish';
    }

    static fromRawCommand(rawCmd) {
        const [modules, deps] = rawCmd.Publish;
        return new PublishCommand(modules, deps);
    }
}

/**
 * UpgradeCommand - Represents an Upgrade command
 */
class UpgradeCommand extends Command {
    constructor(modules, deps, packageId, ticket) {
        super([]);
        this.modules = modules;
        this.deps = deps;
        this.packageId = packageId;
        this.ticket = ticket;
    }

    getTypeName() {
        return 'Upgrade';
    }

    toDisplayString() {
        return 'Upgrade';
    }

    static fromRawCommand(rawCmd) {
        const [modules, deps, packageId, ticket] = rawCmd.Upgrade;
        return new UpgradeCommand(modules, deps, packageId, ticket);
    }
}

class Transaction {
    constructor() {
        // Top-level transaction fields
        this.digest = null;
        this.sender = null;
        this.epoch = null;
        this.checkpoint = null;
        this.protocol_version = null;
        this.network = null;
        this.status = null;
        this.expiration = null;

        // Transaction data fields
        this.kind = null; // Will store the full transaction kind (e.g., ProgrammableTransaction)

        // Unified gas information (combines gas_data and gas_charges)
        this.gas_data = {
            // From transaction_data.json (gas_data)
            payment: null,      // Array of payment objects [object_id, version, digest]
            owner: null,        // Gas owner address
            price: null,        // Gas price
            budget: null,       // Gas budget

            // From transaction_gas_report.json
            computation_cost: null,
            storage_cost: null,
            non_refundable_fee: null,
            storage_rebate: null,
            gas_used: null,
            reference_gas_price: null,
            storage_gas_price: null,
            rebate_rate: null,

            // Derived fields
            coins: [],          // Array of object_id strings (extracted from payment)
            per_object_breakup: [] // Array of { object_id, size, storage_cost, non_refundable_fee, storage_rebate }
        };

        // Dependencies
        this.deps = [];

        // Changed objects - just IDs, details are in _objects
        this.changed_objects = []; // Array of object_id strings

        // Objects involved in the transaction - THE SOURCE OF TRUTH
        this._objects = []; // Internal storage: { object_id, version, status, source, type, object_type }

        // Raw JSON data (for debugging and transition period)
        this._rawData = {
            transaction_data: null,
            transaction_effects: null,
            transaction_gas_report: null,
            replay_cache_summary: null,
            move_call_info: null
        };
    }

    /**
     * Load replay_cache_summary.json and extract relevant fields
     */
    loadReplayCacheSummary(json) {
        this._rawData.replay_cache_summary = json;

        // Extract top-level fields
        this.epoch = json.epoch_id || null;
        this.checkpoint = json.checkpoint || null;
        this.protocol_version = json.protocol_version || null;
        this.network = json.network || null;

        // Process cache_entries and rename to objects
        if (json.cache_entries && Array.isArray(json.cache_entries)) {
            json.cache_entries.forEach(entry => {
                const obj = {
                    object_id: entry.object_id,
                    version: entry.version,
                    status: null, // Will be populated from transaction_effects
                    source: null, // Will be populated when we load transaction_data
                    type: null, // Will be populated based on object_type
                    object_type: entry.object_type // Keep the full object_type structure
                };

                this._objects.push(obj);
            });
        }
    }

    /**
     * API: Get all objects (both packages and move objects)
     */
    get allObjects() {
        return this._objects;
    }

    /**
     * API: Get only packages
     */
    get packages() {
        return this._objects.filter(obj => {
            return obj.object_type && obj.object_type.Package !== undefined;
        });
    }

    /**
     * API: Get only move objects (non-packages)
     */
    get objects() {
        return this._objects.filter(obj => {
            return obj.object_type && obj.object_type.MoveObject !== undefined;
        });
    }

    /**
     * Load transaction_data.json and extract relevant fields
     */
    loadTransactionData(json) {
        this._rawData.transaction_data = json;

        // Extract from V1 structure
        const v1 = json.V1 || {};

        // Extract sender
        this.sender = v1.sender || null;

        // Extract expiration
        this.expiration = v1.expiration || null;

        // Store kind as-is
        this.kind = v1.kind || null;

        // Extract gas_data fields into unified gas_data object
        const gasData = v1.gas_data || {};
        this.gas_data.payment = gasData.payment || null;
        this.gas_data.owner = gasData.owner || null;
        this.gas_data.price = gasData.price || null;
        this.gas_data.budget = gasData.budget || null;

        // Extract gas coin object IDs from payment
        if (this.gas_data.payment && Array.isArray(this.gas_data.payment)) {
            this.gas_data.coins = this.gas_data.payment.map(p => p[0]);
        }

        // Populate source field for objects now that we have transaction data
        this._populateObjectSources();
    }

    /**
     * Populate the source field for all objects
     * Should be called after loadTransactionData
     */
    _populateObjectSources() {
        // Get input object IDs from transaction data
        const inputObjects = this.getInputObjects();
        const gasObjects = this.getGasPaymentObjects();

        // Update source for all objects
        this._objects.forEach(obj => {
            if (gasObjects.has(obj.object_id)) {
                obj.source = 'Gas';
            } else if (inputObjects.has(obj.object_id)) {
                obj.source = 'Input';
            } else {
                obj.source = 'Runtime';
            }
        });
    }

    /**
     * Update status and source fields in _objects based on changed_objects
     * Should be called after loadTransactionEffects
     */
    _updateObjectStatusAndSource() {
        // Get input object IDs from transaction data
        const inputObjects = this.getInputObjects();
        const gasObjects = this.getGasPaymentObjects();

        // Update _objects with status and source information
        this._objects.forEach(obj => {
            // Determine source
            if (gasObjects.has(obj.object_id)) {
                obj.source = 'Gas';
            } else if (inputObjects.has(obj.object_id)) {
                obj.source = 'Input';
            } else {
                obj.source = 'Runtime';
            }

            // Set status to 'Accessed' by default ONLY if not already set
            // (processV2ChangedObjects/processV1ChangedObjects may have already set it to Created/Modified/Deleted)
            if (!obj.status) {
                obj.status = 'Accessed';
            }
        });
    }

    /**
     * Load transaction_effects.json and extract relevant fields
     * Handles both V1 and V2 formats
     */
    loadTransactionEffects(json) {
        this._rawData.transaction_effects = json;

        // Determine version and extract common fields
        const isV1 = json.V1 !== undefined;
        const isV2 = json.V2 !== undefined;
        const effects = isV1 ? json.V1 : (isV2 ? json.V2 : {});

        // Extract common fields
        this.status = effects.status || null;
        this.epoch = effects.executed_epoch || null;
        this.deps = effects.dependencies || [];
        this.digest = effects.transaction_digest || null;

        // Process changed_objects based on version
        if (isV2) {
            this.processV2ChangedObjects(effects.changed_objects || []);
        } else if (isV1) {
            this.processV1ChangedObjects(effects);
        }

        // Update status and source fields in _objects
        this._updateObjectStatusAndSource();
    }

    /**
     * Process V2 changed_objects
     */
    processV2ChangedObjects(changedObjects) {
        changedObjects.forEach(([objectId, changeInfo]) => {
            // Map id_operation to status
            let status = null;
            if (changeInfo.id_operation === 'Created') {
                status = 'Created';
            } else if (changeInfo.id_operation === 'Deleted') {
                status = 'Deleted';
            } else if (changeInfo.id_operation === 'None') {
                status = 'Modified';
            }

            // Store only the object ID in changed_objects
            this.changed_objects.push(objectId);

            // Find the object in _objects and update its status
            const obj = this._objects.find(o => o.object_id === objectId);
            if (obj) {
                obj.status = status;
            } else if (status === 'Created') {
                // Created objects might not be in cache - add them to _objects
                // Extract version from output_state
                let version = null;
                if (changeInfo.output_state && changeInfo.output_state.ObjectWrite) {
                    version = changeInfo.output_state.ObjectWrite[0]; // This is a digest, need version from input
                }
                if (changeInfo.input_state && changeInfo.input_state.Exist) {
                    version = changeInfo.input_state.Exist[0][0]; // [version, digest]
                }

                this._objects.push({
                    object_id: objectId,
                    version: version,
                    object_type: 'Unknown', // Will be updated if type info is available
                    status: status,
                    source: 'Runtime' // Created objects are always Runtime
                });
            }
        });
    }

    /**
     * Process V1 created, mutated, and deleted objects
     */
    processV1ChangedObjects(effects) {
        // Process created objects
        if (effects.created && Array.isArray(effects.created)) {
            effects.created.forEach(([[objectId, version, _digest], _owner]) => {
                // Store only object ID in changed_objects
                this.changed_objects.push(objectId);

                // Find the object in _objects and update its status
                const obj = this._objects.find(o => o.object_id === objectId);
                if (obj) {
                    obj.status = 'Created';
                } else {
                    // Created objects might not be in cache - add them to _objects
                    this._objects.push({
                        object_id: objectId,
                        version: version,
                        object_type: 'Unknown',
                        status: 'Created',
                        source: 'Runtime' // Created objects are always Runtime
                    });
                }
            });
        }

        // Process mutated objects
        if (effects.mutated && Array.isArray(effects.mutated)) {
            effects.mutated.forEach(([[objectId, version, _digest], _owner]) => {
                // Store only object ID in changed_objects
                this.changed_objects.push(objectId);

                // Find the object in _objects and update its status
                const obj = this._objects.find(o => o.object_id === objectId);
                if (obj) {
                    obj.status = 'Modified';
                }
            });
        }

        // Process deleted objects
        if (effects.deleted && Array.isArray(effects.deleted)) {
            effects.deleted.forEach(([objectId, version, _digest]) => {
                // Store only object ID in changed_objects
                this.changed_objects.push(objectId);

                // Find the object in _objects and update its status
                const obj = this._objects.find(o => o.object_id === objectId);
                if (obj) {
                    obj.status = 'Deleted';
                }
            });
        }
    }

    /**
     * Load transaction_gas_report.json and extract relevant fields
     */
    loadTransactionGasReport(json) {
        this._rawData.transaction_gas_report = json;

        // Extract cost_summary fields
        const costSummary = json.cost_summary || {};
        this.gas_data.computation_cost = costSummary.computationCost || null;
        this.gas_data.storage_cost = costSummary.storageCost || null;
        this.gas_data.storage_rebate = costSummary.storageRebate || null;
        this.gas_data.non_refundable_fee = costSummary.nonRefundableStorageFee || null;

        // Extract other gas fields
        this.gas_data.gas_used = json.gas_used || null;
        this.gas_data.reference_gas_price = json.reference_gas_price || null;
        this.gas_data.storage_gas_price = json.storage_gas_price || null;
        this.gas_data.rebate_rate = json.rebate_rate || null;

        // Process per_object_storage into per_object_breakup
        if (json.per_object_storage && Array.isArray(json.per_object_storage)) {
            this.gas_data.per_object_breakup = json.per_object_storage.map(([objectId, storageInfo]) => ({
                object_id: objectId,
                size: storageInfo.new_size || 0,
                storage_cost: storageInfo.storage_cost || 0,
                storage_rebate: storageInfo.storage_rebate || 0,
                // Calculate non_refundable_fee based on rebate_rate
                non_refundable_fee: this.calculateNonRefundableFee(
                    storageInfo.storage_cost || 0,
                    storageInfo.storage_rebate || 0,
                    this.gas_data.rebate_rate || 9900
                )
            }));
        }

    }

    /**
     * Helper: Calculate non-refundable fee for an object
     */
    calculateNonRefundableFee(storageCost, storageRebate, rebateRate) {
        // Non-refundable fee = storage_rebate * (10000 - rebate_rate) / 10000
        return Math.floor(storageRebate * (10000 - rebateRate) / 10000);
    }

    /**
     * Load move_call_info.json and merge with commands from transaction_data
     */
    loadPtbDetails(json) {
        this._rawData.move_call_info = json;

        // Merge command_signatures with commands in kind.ProgrammableTransaction
        if (json.command_signatures && Array.isArray(json.command_signatures)) {
            const signatures = json.command_signatures;
            const commands = this.kind?.ProgrammableTransaction?.commands || [];

            // Add _signature field to each command
            commands.forEach((cmd, index) => {
                if (index < signatures.length) {
                    cmd._signature = signatures[index]; // Can be null for non-MoveCall commands
                }
            });
        }
    }

    // ============================================================================
    // Helper Methods for UI Rendering
    // ============================================================================

    /**
     * Get object type by object ID
     */
    getObjectType(objectId) {
        const obj = this._objects.find(o => o.object_id === objectId);
        return obj?.object_type || null;
    }

    /**
     * Get MoveType for an object by ID
     */
    getObjectMoveType(objectId) {
        const obj = this._objects.find(o => o.object_id === objectId);
        if (!obj || !obj.object_type) {
            return null;
        }

        if (obj.object_type.Package) {
            return new MoveType(null, null, 'MovePackage', [], true);
        }

        if (obj.object_type.MoveObject) {
            return MoveType.fromTypeStructure(obj.object_type.MoveObject, this);
        }

        return null;
    }

    /**
     * Get object version by object ID
     */
    getObjectVersion(objectId) {
        const obj = this._objects.find(o => o.object_id === objectId);
        return obj?.version || null;
    }

    /**
     * Extract all object IDs from transaction inputs
     * Also includes packages from MoveCall commands
     */
    getInputObjects() {
        const objects = new Set();
        if (this.kind?.ProgrammableTransaction?.inputs) {
            this.kind.ProgrammableTransaction.inputs.forEach(input => {
                if (input.Object) {
                    if (input.Object.ImmOrOwnedObject) {
                        objects.add(input.Object.ImmOrOwnedObject[0]);
                    } else if (input.Object.SharedObject) {
                        objects.add(input.Object.SharedObject.id);
                    } else if (input.Object.Receiving) {
                        objects.add(input.Object.Receiving[0]);
                    }
                }
            });
        }

        // Also include packages from MoveCall commands
        if (this.kind?.ProgrammableTransaction?.commands) {
            this.kind.ProgrammableTransaction.commands.forEach(cmd => {
                if (cmd.MoveCall && cmd.MoveCall.package) {
                    objects.add(cmd.MoveCall.package);
                }
            });
        }

        return objects;
    }

    /**
     * Get all created objects (from _objects with status 'Created')
     */
    getCreatedObjects() {
        return this._objects.filter(o => o.status === 'Created');
    }

    /**
     * Get all deleted objects (from _objects with status 'Deleted')
     */
    getDeletedObjects() {
        return this._objects.filter(o => o.status === 'Deleted');
    }

    /**
     * Get all modified objects (from _objects with status 'Modified')
     */
    getModifiedObjects() {
        return this._objects.filter(o => o.status === 'Modified');
    }

    /**
     * Check if an object was deleted
     */
    isObjectDeleted(objectId) {
        const obj = this._objects.find(o => o.object_id === objectId);
        return obj && obj.status === 'Deleted';
    }

    /**
     * Get all object IDs that appear in changed_objects
     */
    getChangedObjectIds() {
        return new Set(this.changed_objects);
    }

    /**
     * Get gas payment object IDs
     */
    getGasPaymentObjects() {
        const gasObjects = new Set();
        if (this.gas_data.payment && Array.isArray(this.gas_data.payment)) {
            this.gas_data.payment.forEach(payment => {
                gasObjects.add(payment[0]); // object_id
            });
        }
        return gasObjects;
    }

    /**
     * Get parsed Command objects from PTB commands
     * Returns an array of Command instances (MoveCallCommand, SplitCoinsCommand, etc.)
     */
    getCommands() {
        const rawCommands = this.kind?.ProgrammableTransaction?.commands || [];
        const inputs = this.kind?.ProgrammableTransaction?.inputs || [];

        return rawCommands.map(rawCmd => {
            if (rawCmd.MoveCall) {
                return MoveCallCommand.fromRawCommand(rawCmd, this);
            } else if (rawCmd.SplitCoins) {
                return SplitCoinsCommand.fromRawCommand(rawCmd, this, inputs);
            } else if (rawCmd.MergeCoins) {
                return MergeCoinsCommand.fromRawCommand(rawCmd, this, inputs);
            } else if (rawCmd.MakeMoveVec) {
                return MakeMoveVecCommand.fromRawCommand(rawCmd, this, inputs, rawCommands);
            } else if (rawCmd.TransferObjects) {
                return TransferObjectsCommand.fromRawCommand(rawCmd);
            } else if (rawCmd.Publish) {
                return PublishCommand.fromRawCommand(rawCmd);
            } else if (rawCmd.Upgrade) {
                return UpgradeCommand.fromRawCommand(rawCmd);
            } else {
                // Fallback for unknown command types - return a generic command
                return null;
            }
        }).filter(cmd => cmd !== null);
    }

    // ============================================================================
    // Static Factory Method for Loading from Files
    // ============================================================================

    /**
     * Load a transaction from a directory containing the JSON files
     * @param {Object} files - Object with file contents { transaction_data, transaction_effects, etc. }
     * @returns {Transaction} - Loaded transaction object
     */
    static fromFiles(files) {
        const transaction = new Transaction();

        // Load files in order (some depend on others)
        if (files.replay_cache_summary) {
            transaction.loadReplayCacheSummary(files.replay_cache_summary);
        }

        if (files.transaction_data) {
            transaction.loadTransactionData(files.transaction_data);
        }

        if (files.transaction_effects) {
            transaction.loadTransactionEffects(files.transaction_effects);
        }

        if (files.transaction_gas_report) {
            transaction.loadTransactionGasReport(files.transaction_gas_report);
        }

        if (files.move_call_info) {
            transaction.loadPtbDetails(files.move_call_info);
        }

        return transaction;
    }
}
