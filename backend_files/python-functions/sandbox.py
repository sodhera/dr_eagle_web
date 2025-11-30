"""
Python Code Execution Sandbox

This module provides secure sandboxed Python code execution with:
- Import restrictions (whitelist only)
- No file system or network access
- Timeout enforcement via Cloud Function config
- Memory limits
"""

import io
import sys
import time
from typing import Any, Dict, Optional

# Whitelisted modules that are safe to import
ALLOWED_MODULES = {
    'json', 'math', 'datetime', 'statistics', 'itertools',
    'functools', 'collections', 're', 'string', 'random'
}

# Whitelisted builtins - only safe functions
ALLOWED_BUILTINS = {
    'abs', 'all', 'any', 'bin', 'bool', 'chr', 'dict', 'enumerate',
    'filter', 'float', 'int', 'len', 'list', 'map', 'max', 'min',
    'print', 'range', 'round', 'sorted', 'str', 'sum', 'tuple', 'zip',
    'set', 'frozenset', 'reversed', 'slice', 'type', 'isinstance',
    'hasattr', 'getattr', 'divmod', 'pow', 'hex', 'oct', 'ord',
    'True', 'False', 'None'
}


def safe_import(name, globals=None, locals=None, fromlist=(), level=0):
    """
    Custom import hook that only allows whitelisted modules.
    Raises ImportError for blacklisted modules.
    """
    if name not in ALLOWED_MODULES:
        raise ImportError(f"Module '{name}' is not allowed. Only whitelisted modules can be imported.")
    return __import__(name, globals, locals, fromlist, level)


def create_safe_environment(input_data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Create a restricted global environment for code execution.
    
    Args:
        input_data: Optional dict of variables to make available in the code
        
    Returns:
        Dict containing safe builtins and input data
    """
    # Start with empty globals
    safe_globals = {'__builtins__': {}}
    
    # Add whitelisted builtins
    for name in ALLOWED_BUILTINS:
        if hasattr(__builtins__, name):
            safe_globals['__builtins__'][name] = getattr(__builtins__, name)
        else:
            # Handle True, False, None
            safe_globals['__builtins__'][name] = eval(name)
    
    # Add custom import function
    safe_globals['__builtins__']['__import__'] = safe_import
    
    # Add input data if provided
    if input_data:
        safe_globals.update(input_data)
    
    return safe_globals


def execute_code(code: str, input_data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Execute Python code in a sandboxed environment.
    
    Args:
        code: Python code string to execute
        input_data: Optional dict of input variables
        
    Returns:
        Dict with keys:
        - success (bool): Whether execution succeeded
        - output (str): Captured stdout
        - error (str | None): Error message if failed
        - execution_time_ms (int): Execution duration in milliseconds
    """
    start_time = time.time()
    
    # Capture stdout
    stdout_capture = io.StringIO()
    old_stdout = sys.stdout
    sys.stdout = stdout_capture
    
    try:
        # Create safe environment
        safe_globals = create_safe_environment(input_data)
        
        # Execute code
        exec(code, safe_globals)
        
        # Get output
        output = stdout_capture.getvalue()
        execution_time_ms = int((time.time() - start_time) * 1000)
        
        return {
            'success': True,
            'output': output,
            'error': None,
            'execution_time_ms': execution_time_ms
        }
        
    except Exception as e:
        execution_time_ms = int((time.time() - start_time) * 1000)
        error_type = type(e).__name__
        error_message = str(e)
        
        return {
            'success': False,
            'output': stdout_capture.getvalue(),
            'error': f"{error_type}: {error_message}",
            'execution_time_ms': execution_time_ms
        }
        
    finally:
        # Restore stdout
        sys.stdout = old_stdout
