"""
Cloud Function for executing Python code in a sandboxed environment.

This function is called via HTTP from the MCP server to execute
user-provided Python code with strict security controls.
"""

import functions_framework
from flask import jsonify, Request
import json
from sandbox import execute_code


@functions_framework.http
def execute_python_code(request: Request):
    """
    HTTP Cloud Function to execute Python code.
    
    Request body (JSON):
    {
        "code": "print('hello')",
        "input_data": {"x": 10}  # Optional
    }
    
    Response (JSON):
    {
        "success": true,
        "output": "hello\\n",
        "error": null,
        "execution_time_ms": 45
    }
    
    Security:
    - Only whitelisted modules can be imported
    - No file system or network access
    - 30 second timeout (enforced by Cloud Function config)
    - 512MB memory limit
    """
    # Enable CORS for MCP server
    if request.method == 'OPTIONS':
        headers = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Max-Age': '3600'
        }
        return ('', 204, headers)
    
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
    }
    
    try:
        # Parse request
        request_json = request.get_json(silent=True)
        
        if not request_json:
            return jsonify({
                'success': False,
                'output': '',
                'error': 'Invalid JSON request body',
                'execution_time_ms': 0
            }), 400, headers
        
        code = request_json.get('code')
        input_data = request_json.get('input_data')
        
        if not code:
            return jsonify({
                'success': False,
                'output': '',
                'error': 'Missing required field: code',
                'execution_time_ms': 0
            }), 400, headers
        
        if not isinstance(code, str):
            return jsonify({
                'success': False,
                'output': '',
                'error': 'Field "code" must be a string',
                'execution_time_ms': 0
            }), 400, headers
        
        # Execute code
        result = execute_code(code, input_data)
        
        return jsonify(result), 200, headers
        
    except Exception as e:
        return jsonify({
            'success': False,
            'output': '',
            'error': f'Internal error: {str(e)}',
            'execution_time_ms': 0
        }), 500, headers
