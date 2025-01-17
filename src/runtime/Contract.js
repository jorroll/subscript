
/**
 * @imports
 */

export default class Contract {

    constructor( ownerContract, graph, callee, params = {}, $thread = null, exits = null ) {
        this.ownerContract = ownerContract;
        this.graph = graph;
        this.callee = callee;
        this.params = params;
        this.exits = exits || new Map;
        this.$thread = $thread || { entries: new Map, sequence: [], ownerContract: this };
        this.subContracts = new Map;
        this.contract = function( contractId, arg1, arg2 = null, arg3 = null ) {
            if ( !this.graph.subContracts[ contractId ] ) {
                throw new Error( `[${ this.graph.type }:${ this.graph.lineage }]: Graph not found for child contract ${ contractId }.` );
            }

            let subGraph = this.graph.subContracts[ contractId ];
            let subParams = {
                ...this.params,
                isIterationContract: arguments.length === 3,
                iterationId: arguments.length === 3 && arg1,
                isFunctionContract: arguments.length === 4,
                functionType: arguments.length === 4 && arg1,
                isSubscriptFunction: arguments.length === 4 && arg2,
                functionScope: ( this.params.isFunctionContract && this.graph.lineage ) || this.params.functionScope,
            };

            if ( subParams.isIterationContract ) {
                // This is an iteration contract
                let callee = arg2;
                // Create iteration
                let iterationInstanceContract = new Contract( this, subGraph, callee, subParams, this.$thread, this.exits );
                // Add iteration
                let iterations = this.subContracts.get( contractId );
                if ( !iterations ) {
                    iterations = new Map;
                    this.subContracts.set( contractId, iterations );
                }
                // Dispose all existing
                if ( iterations.has( subParams.iterationId ) ) {
                    iterations.get( subParams.iterationId ).dispose();
                }
                iterations.set( subParams.iterationId, iterationInstanceContract );
                return iterationInstanceContract.call();
            }

            let callee, subContract, returnValue;
            // Dispose existing
            if ( this.subContracts.has( contractId ) ) {
                this.subContracts.get( contractId ).dispose();
            }

            if ( subParams.isFunctionContract ) {
                // Function contracts
                callee = arg3, returnValue = subContract = new Contract( this, subGraph, callee, subParams );
                if ( subParams.functionType !== 'FunctionDeclaration' ) {
                    returnValue = callee instanceof ( async () => {} ).constructor
                        ? async function() { return subContract.call( this, ...arguments ); }
                        : function() { return subContract.call( this, ...arguments ); };
                    bindFunctionToRuntime( returnValue, subContract );
                }
            } else {
                // Regular contracts
                callee = arg1, subContract = new Contract( this, subGraph, callee, subParams, this.$thread, this.exits );
                returnValue = subContract.call();
            }

            this.subContracts.set( contractId, subContract );
            return returnValue;
        }.bind( this );
        this.contract.memo = Object.create( null );
        // ---------------------------
        this.contract.exiting = function( keyword, arg ) {
            if ( !arguments.length ) return this.exits.size;
            let exitMatch = this.exits.get( keyword ) === arg;
            if ( exitMatch ) this.exits.clear();
            return exitMatch;
        }.bind( this );
        // ---------------------------
        this.contract.exit = function( keyword, arg ) {
            this.exits.set( keyword, arg );
        }.bind( this );
        // ---------------------------
        this.contract.functions = new Map;
        this.contract.functions.define = ( functionDeclaration, contractInstance ) => {
            this.contract.functions.set( functionDeclaration, contractInstance );
            bindFunctionToRuntime( functionDeclaration, contractInstance, true );
        }
        const bindFunctionToRuntime = ( _function, runtime, isDeclaration = false ) => {
            if ( !isDeclaration ) {
                Object.defineProperty( _function, 'length', { configurable: true, value: runtime.callee.length - 1 } );
                Object.defineProperty( _function, 'name', { configurable: true, value: runtime.callee.name } );
            }
            if ( runtime.params.isSubscriptFunction ) {
                _function.thread = runtime.thread.bind( runtime );
                _function.dispose = runtime.dispose.bind( runtime );
                Object.defineProperty( _function, 'runtime', { value: runtime } );
                Object.defineProperty( _function, 'sideEffects', { configurable: true, value: runtime.graph.sideEffects || '' } );
                Object.defineProperty( _function, 'subscriptSource', { configurable: true, value: runtime.graph.subscriptSource || '' } );
                Object.defineProperty( _function, 'originalSource', { configurable: true, value: runtime.graph.originalSource || '' } );
            };
        }
    }

    fire( contractUrl, event, refs ) {
        if ( !this.ownerContract ) return;
        return this.ownerContract.fire( contractUrl, event, refs );
    }

    call( $this, ...$arguments ) {
        if ( this.disposed ) {
            throw new Error( `[${ this.graph.type }:${ this.graph.lineage }]: Instance not runable after having been disposed.` );
        }
        let returnValue = this.callee.call( $this, this.contract, ...$arguments );
        if ( this.graph.$sideEffects ) {
            for ( let referenceId in this.graph.effects ) {
                for ( let effectRef of this.graph.effects[ referenceId ].refs ) {
                    // Build side effects
                    this.buildThread( [], effectRef, [], 0, true );
                }
            }
        }
        if ( !this.ownerContract || this.params.isFunctionContract ) {
            let exitReturnValue = this.exits.get( 'return' );
            this.exits.clear();
            if ( exitReturnValue !== undefined ) {
                returnValue = returnValue instanceof Promise ? returnValue.then( () => exitReturnValue ) : exitReturnValue;
            }
        }
        return returnValue;
    }

    iterate( keys = [] ) {
        if ( this.disposed ) return false;
        if ( ![ 'ForOfStatement', 'ForInStatement'].includes( this.graph.type ) || this.subContracts.size !== 1 ) {
            throw new Error( `Contract ${ this.graph.lineage } is not an iterator.` );
        }
        let [ [ /* iterationContractId */, iterationInstances ] ] = this.subContracts;
        let prev, _await = ( prev, callback ) => prev instanceof Promise ? prev.then( callback ) : callback();
        if ( !keys.length || ( keys.includes( 'length') && this.graph.type === 'ForOfStatement' ) ) {
            for ( let [ /* iterationId */, iterationInstance ] of iterationInstances ) {
                prev = _await( prev, () => iterationInstance.call() );
            }
        } else {
            for ( let key of keys ) {
                let instance = iterationInstances.get( key ) || iterationInstances.get( parseInt( key ) );
                if ( !instance ) continue;
                prev = _await( prev, () => instance.call() );
            }
        }
        return prev;
    }

    thread( ...eventRefs ) {
        if ( this.disposed ) return false;
        this.$thread.active = true;
        for ( let referenceId in this.graph.effects ) {
            for ( let effectRef of this.graph.effects[ referenceId ].refs ) {
                for ( let eventRef of eventRefs ) {
                    let [ isMatch, remainder, computes ] = this.matchRefs( eventRef, effectRef );
                    if ( !isMatch ) continue;
                    this.buildThread( eventRef, effectRef, computes, remainder );
                }
            }
        }
        return this.runThread();
    }

    runThread() {
        let execute = ( entry, refs ) => {
            if ( [ 'ForOfStatement', 'ForInStatement' ].includes( entry.graph.type ) 
            && refs.every( ref => ref.executionPlan.isIterationContractTarget ) ) {
                let targets = refs.map( ref => ref.executionPlan.iterationTarget );
                this.fire( entry.graph.lineage, 'iterating', refs );
                return entry.iterate( targets );
            }
            this.fire( entry.graph.lineage, 'executing', refs );
            return entry.call();
        };
        let prev, entry, refs, _await = ( prev, callback ) => prev instanceof Promise ? prev.then( callback ) : callback();
        while ( 
            ( entry = this.$thread.sequence.shift() ) 
            && ( refs = [ ...this.$thread.entries.get( entry ) ] ) 
            && this.$thread.entries.delete( entry ) // Important: to allow re-entry on susequent threads
        ) {
            prev = _await( prev, () => {
                if ( entry.disposed || !entry.filterRefs( refs ).length ) return;
                this.$thread.current = entry;
                let maybePromise = execute( entry, refs );
                _await( maybePromise, () => {
                    for ( let ref of refs ) {
                        [].concat( ref.executionPlan.assigneeRef || ref.executionPlan.assigneeRefs || [] ).forEach( assigneeRef => {
                            entry.buildThread( [], assigneeRef, [], 0 );
                        } );
                    }
                } );
                return maybePromise;
            } );
        }
        return _await( prev, () => {
            let _ret = this.exits.get( 'return' );
            this.exits.clear();
            this.$thread.current = null;
            this.$thread.active = false;
            return _ret;
        } );
    }

    buildThread( eventRef, effectRef, computes, remainder = 0, isSideEffect = false ) {
        let shouldMatchEventRef = remainder > 0;
        if ( this.ownerContract ) {
            // IMPORTANT: effectRef at global level are not supposed to be checked for computes and condition
            if ( !this.compute( computes ) ) return;
            if ( effectRef.condition !== undefined && !this.assert( effectRef.condition ) ) return;
        } else if ( !shouldMatchEventRef ) {
            shouldMatchEventRef = computes.length || effectRef.condition !== undefined;
        }
        let subscriptionsObject = isSideEffect ? effectRef.$subscriptions : effectRef.subscriptions;
        // First we assert the conditions for the effectRef before moving on
        Object.keys( subscriptionsObject ).forEach( fullReferenceUrl => {
            let [ contractUrl, referenceId ] = fullReferenceUrl.split( ':' );
            let selectRefs = _subscriberInstance => {
                if ( !_subscriberInstance ) return;
                _subscriberInstance.selectRefs( referenceId, subscriptionsObject[ fullReferenceUrl ], shouldMatchEventRef ? eventRef : null );
            }
            // We find the subscriber instance
            let subscriberInstance = this.locate( contractUrl );
            if ( Array.isArray( subscriberInstance ) ) {
                subscriberInstance.forEach( selectRefs );
            } else {
                selectRefs( subscriberInstance );
            }
        } );
    }

    selectRefs( referenceId, refIds, eventRef = null ) {
        // We'll select refs from within the following reference
        let $thread = this.$thread;
        let reference = this.graph.signals[ referenceId ];
        // -----------------------------------------
        let compare = ( a, b ) => a.graph.lineage.localeCompare( b.graph.lineage, undefined, { numeric: true } );
        let selectRef = ( ref, computes = [], executionPlan = {} ) => {
            // If this addition is by the side effect of a function, "this" can sometimes be higher in scope
            if ( !$thread.active ) return;
            if ( $thread.current && compare( this, $thread.current ) < 0 ) return;
            let refs = $thread.entries.get( this );
            if ( !refs ) {
                refs = new Set;
                $thread.entries.set( this, refs );
                $thread.sequence.push( this );
                $thread.sequence.sort( compare );
            }
            refs.add( { ...ref, computes, executionPlan } );
            if ( !executionPlan.assigneeRef && [ 'VariableDeclaration', 'AssignmentExpression' ].includes( this.graph.type ) ) {
                executionPlan.assigneeRefs = [];
                for ( let referenceId in this.graph.effects ) {
                    executionPlan.assigneeRefs.push( ...this.graph.effects[ referenceId ].refs )
                }
            }
        };
        // -----------------------------------------
        for ( let refId of refIds ) {
            // The ref within reference
            let ref = reference.refs[ refId ];
            // First we assert the conditions for the ref before moving on
            if ( !eventRef ) {
                // AffectedRef matched event ref... So we select ALL refs within reference
                selectRef( ref );
                continue;
            }
            // We match ref to decide whether or how to select it
            let [ isMatch_b, remainder_b, computes_b ] = this.matchRefs( eventRef, ref );
            if ( !isMatch_b ) continue;
            if ( remainder_b <= 0 ) {
                // SubscriberRef matches event ref
                selectRef( ref, computes_b );
                continue;
            }
            let eventRef_balance = eventRef.slice( -remainder_b );
            let assigneeReference = 'assignee' in reference ? this.graph.effects[ reference.assignee ] : null;
            if ( assigneeReference ) {
                assigneeReference.refs.forEach( assigneeRef => {
                    if ( assigneeRef.depth.length ) {
                        let [ isMatch_c, remainder_c, computes_c ] = this.matchRefs( eventRef_balance, assigneeRef.depth );
                        let computes_d = computes_b.concat( computes_c );
                        if ( isMatch_c && remainder_c > 0 ) {
                            // We move on passively to effects on the assignee
                            let newEventRef = assigneeRef.path.concat( eventRef_balance.slice( -remainder_c ) );
                            this.buildThread( newEventRef, assigneeRef, computes_d, remainder_c );
                        } else if ( isMatch_c ) {
                            // Match is successful on the destructuring side... so we select
                            selectRef( ref, computes_d, { assigneeRef } );
                        }
                    } else {
                        // We move on passively to effects on the assignee
                        let newEventRef = assigneeRef.path.concat( eventRef_balance );
                        this.buildThread( newEventRef, assigneeRef, computes_b, remainder_b );
                    }
                } );
                continue;
            }
            if ( remainder_b === 1 && this.graph.type === 'ForOfStatement' ) {
                // An iteration item was changed or the length property of the list was changed
                selectRef( ref, computes_b, { isIterationContractTarget: true, iterationTarget: eventRef_balance[ 0 ] } );
                continue;
            }
            if ( remainder_b === 1 && this.graph.type === 'ForInStatement' ) {
                // An iteration property was changed
                selectRef( ref, computes_b, { isIterationContractTarget: true, iterationTarget: eventRef_balance[ 0 ] } );
                continue;
            }
        }
    }

    filterRefs( refs ) {
        return refs.filter( ref => {
            if ( !this.compute( ref.computes ) ) return;
            if ( ref.condition !== undefined && !this.assert( ref.condition ) ) return;
            return true;
        } );
    }

    matchRefs( a, b ) {
        let pathA, $pathA, pathB, $pathB;
        if ( Array.isArray( a ) ) {
            pathA = a, $pathA = a.dotSafe ? a.join( '.' ) : undefined;
        } else {
            pathA = a.path, $pathA = a.$path;
        }
        if ( Array.isArray( b ) ) {
            pathB = b, $pathB = b.dotSafe ? b.join( '.' ) : undefined;
        } else {
            pathB = b.path, $pathB = b.$path;
        }
        let remainder = pathA.length - pathB.length;
        if ( remainder > 0 ) {
            [ pathA, pathB, $pathA, $pathB ] = [ pathB, pathA, $pathB, $pathA ];
        }
        if ( $pathA && $pathB ) {
            return [ `${ $pathB }.`.startsWith( `${ $pathA }.` ), remainder, [] ];
        }
        let computes = [];
        let getVal = element => ( typeof element === 'object' ? element.name : element );
        let compareIdentifiers = ( a, b ) => {
            if ( !a || !b ) return false;
            let isComputeA = typeof a === 'object' && ( 'memoId' in a ),
                isComputeB = typeof b === 'object' && ( 'memoId' in b );
            if ( isComputeA || isComputeB ) {
                computes.push( memo => {
                    return ( isComputeA ? memo[ a.memoId ] : getVal( a ) ) === ( isComputeB ? memo[ b.memoId ] : getVal( b ) ) 
                } );
                return true;
            }
            return getVal( a ) === getVal( b );
        };
        return [
            pathA.reduce( ( prev, identifier, i ) => prev && compareIdentifiers( identifier, pathB[ i ] ), true ),
            remainder,
            computes,
        ];
    }

    locate( contractUrl ) {
        let ownLineage_ = this.graph.lineage + '/';
        let contractUrl_ = contractUrl + '/';
        if ( contractUrl_ === ownLineage_ ) return this;
        if ( contractUrl_.startsWith( ownLineage_ ) ) {
            let postLineage = contractUrl.slice( ownLineage_.length ).split( '/' );
            let subContract = this.subContracts.get( parseInt( postLineage.shift() ) );
            if ( postLineage.length) {
                if ( subContract instanceof Map ) {
                    return Array.from( subContract ).reduce( ( subContracts, [ key, _subContract ] ) => {
                        return subContracts.concat( _subContract.locate( contractUrl ) );
                    }, [] );
                }
                if ( subContract ) {
                    return subContract.locate( contractUrl );
                }
            }
            return subContract;
        }
        if ( this.ownerContract ) {
            return this.ownerContract.locate( contractUrl );
        }
    }

    compute( computes ) {
        return !computes.some( compute => compute( this.contract.memo ) === false );
    }

    assert( condition ) {
        if ( typeof condition === 'string' && condition.includes( ':' ) ) {
            let [ contractUrl, _condition ] = condition.split( ':' );
            return this.locate( contractUrl ).assert( _condition );
        }
        let conditionDef = this.graph.conditions[ condition ];
        let memo = this.contract.memo;
        if ( typeof conditionDef.parent !== 'undefined'  && !this.assert( conditionDef.parent ) ) return false;
        if ( typeof conditionDef.switch !== 'undefined' ) {
            return conditionDef.cases.some( _case => memo[ _case ] === memo[ conditionDef.switch ] );
        }
        if ( typeof conditionDef.whenNot !== 'undefined' ) {
            return !memo[ conditionDef.whenNot ];
        }
        if ( typeof conditionDef.when !== 'undefined' ) {
            return memo[ conditionDef.when ];
        }
        return true;
    }

    dispose() {
        if ( this.params.isFunctionContract ) return;
        this.subContracts.forEach( ( subContract, contractId ) => {
            if ( subContract instanceof Map ) {
                subContract.forEach( subContract => subContract.dispose() );
                subContract.clear();
            } else {
                subContract.dispose();
            }
        } );
        this.subContracts.clear();
        delete this.ownerContract;
        delete this.callee;
        delete this.params;
        delete this.contract.memo;
        this.disposed = true;
    }

}