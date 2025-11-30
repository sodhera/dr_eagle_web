"""
Unit tests for Python sandbox execution.

Run with: pytest test_sandbox.py
"""

import pytest
from sandbox import execute_code, safe_import, create_safe_environment


def test_simple_execution():
    """Test basic code execution"""
    result = execute_code("print('hello world')")
    assert result['success'] is True
    assert result['output'] == 'hello world\n'
    assert result['error'] is None
    assert result['execution_time_ms'] >= 0


def test_with_input_data():
    """Test code execution with input data"""
    result = execute_code(
        "result = x + y\nprint(f'Sum: {result}')",
        input_data={'x': 5, 'y': 10}
    )
    assert result['success'] is True
    assert 'Sum: 15' in result['output']


def test_math_module_allowed():
    """Test that whitelisted modules work"""
    code = """
import math
print(math.pi)
print(math.sqrt(16))
"""
    result = execute_code(code)
    assert result['success'] is True
    assert '3.14' in result['output']
    assert '4.0' in result['output']


def test_json_module_allowed():
    """Test JSON module works"""
    code = """
import json
data = {"name": "test", "value": 123}
print(json.dumps(data))
"""
    result = execute_code(code)
    assert result['success'] is True
    assert '"name": "test"' in result['output']


def test_dangerous_import_blocked():
    """Test that dangerous modules are blocked"""
    result = execute_code("import os\nprint(os.listdir('.'))")
    assert result['success'] is False
    assert 'ImportError' in result['error']
    assert "not allowed" in result['error']


def test_subprocess_blocked():
    """Test subprocess module is blocked"""
    result = execute_code("import subprocess\nsubprocess.run(['ls'])")
    assert result['success'] is False
    assert 'ImportError' in result['error']


def test_socket_blocked():
    """Test socket module is blocked"""
    result = execute_code("import socket")
    assert result['success'] is False
    assert 'ImportError' in result['error']


def test_sys_blocked():
    """Test sys module is blocked"""
    result = execute_code("import sys\nprint(sys.version)")
    assert result['success'] is False
    assert 'ImportError' in result['error']


def test_syntax_error():
    """Test that syntax errors are caught"""
    result = execute_code("print('unclosed string")
    assert result['success'] is False
    assert 'SyntaxError' in result['error']


def test_runtime_error():
    """Test that runtime errors are caught"""
    result = execute_code("x = 1 / 0")
    assert result['success'] is False
    assert 'ZeroDivisionError' in result['error']


def test_undefined_variable():
    """Test undefined variable error"""
    result = execute_code("print(undefined_variable)")
    assert result['success'] is False
    assert 'NameError' in result['error']


def test_allowed_builtins():
    """Test that safe builtins work"""
    code = """
nums = [1, 2, 3, 4, 5]
print(sum(nums))
print(max(nums))
print(min(nums))
print(len(nums))
"""
    result = execute_code(code)
    assert result['success'] is True
    assert '15' in result['output']
    assert '5' in result['output']
    assert '1' in result['output']


def test_list_comprehension():
    """Test list comprehensions work"""
    code = """
squares = [x**2 for x in range(10)]
print(squares)
"""
    result = execute_code(code)
    assert result['success'] is True
    assert '[0, 1, 4, 9, 16, 25, 36, 49, 64, 81]' in result['output']


def test_function_definition():
    """Test that functions can be defined"""
    code = """
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

print(fibonacci(10))
"""
    result = execute_code(code)
    assert result['success'] is True
    assert '55' in result['output']


def test_class_definition():
    """Test that classes can be defined"""
    code = """
class Point:
    def __init__(self, x, y):
        self.x = x
        self.y = y
    
    def distance_from_origin(self):
        import math
        return math.sqrt(self.x**2 + self.y**2)

p = Point(3, 4)
print(p.distance_from_origin())
"""
    result = execute_code(code)
    assert result['success'] is True
    assert '5.0' in result['output']


def test_execution_time_tracking():
    """Test that execution time is tracked"""
    result = execute_code("import time\ntime.sleep(0.1)")
    # time module should be blocked
    assert result['success'] is False
    
    # Test successful execution time
    result = execute_code("x = 1 + 1")
    assert result['success'] is True
    assert result['execution_time_ms'] >= 0
    assert result['execution_time_ms'] < 1000  # Should be very fast


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
