from flask import Flask, jsonify, request
from flask_cors import CORS
import random
import string

app = Flask(__name__)
CORS(app)

SAMPLE_TEMPLATES = [
    "function {name}({params}) {{\n    const result = {expr};\n    console.log('{name}:', result);\n    return result;\n}}\n",
    "class {name} {{\n    constructor({params}) {{\n        this.{param1} = {param1};\n    }}\n    \n    {method}() {{\n        return this.{param1} * 2;\n    }}\n}}\n",
    "export const {name} = ({params}) => {{\n    const items = [];\n    for (let i = 0; i < {count}; i++) {{\n        items.push({{ id: i, value: `{prefix}-${{i}}` }});\n    }}\n    return items;\n}};\n",
    "import React from 'react';\n\nexport const {name} = ({{ {params} }}) => {{\n    return (\n        <div className=\"{classname}\">\n            <h1>{title}</h1>\n            <p>{content}</p>\n        </div>\n    );\n}};\n",
    "const {name} = async ({params}) => {{\n    try {{\n        const response = await fetch('{url}');\n        const data = await response.json();\n        return data;\n    }} catch (error) {{\n        console.error('{error_msg}:', error);\n        throw error;\n    }}\n}};\n"
]

def generate_random_line(line_num):
    words = ['apple', 'banana', 'cherry', 'date', 'elderberry', 
             'fig', 'grape', 'honeydew', 'kiwi', 'lemon',
             'mango', 'nectarine', 'orange', 'peach', 'quince',
             'raspberry', 'strawberry', 'tangerine', 'ugli', 'watermelon']
    verbs = ['create', 'update', 'delete', 'fetch', 'process', 
             'transform', 'validate', 'format', 'parse', 'serialize']
    nouns = ['user', 'product', 'order', 'category', 'inventory',
             'transaction', 'payment', 'subscription', 'notification', 'setting']
    
    random.seed(line_num)
    word = random.choice(words)
    verb = random.choice(verbs)
    noun = random.choice(nouns)
    
    return f"// Line {line_num}: {verb.capitalize()} the {noun} data using {word}\n"

def generate_code_sample(num_lines, variant=0):
    lines = []
    random.seed(42 + variant)
    
    for i in range(num_lines):
        if random.random() < 0.1:
            template_idx = random.randint(0, len(SAMPLE_TEMPLATES) - 1)
            template = SAMPLE_TEMPLATES[template_idx]
            
            params = {
                'name': f'{random.choice(["My", "Custom", "Base", "Advanced", "Simple"])}{random.choice(["Handler", "Manager", "Controller", "Service", "Helper"])}',
                'params': ', '.join([f'param{j}' for j in range(random.randint(1, 3))]),
                'expr': f'{random.randint(1, 100)} {random.choice(["+", "-", "*", "/"])} {random.randint(1, 100)}',
                'param1': f'param{random.randint(1, 3)}',
                'method': random.choice(['process', 'calculate', 'transform', 'validate', 'execute']),
                'count': random.randint(5, 50),
                'prefix': random.choice(['item', 'entry', 'record', 'node', 'element']),
                'classname': random.choice(['container', 'wrapper', 'card', 'panel', 'section']),
                'title': random.choice(['Welcome', 'Dashboard', 'Settings', 'Profile', 'Reports']),
                'content': random.choice(['Hello World', 'Loading...', 'Success!', 'Error occurred', 'No data available']),
                'url': random.choice(['/api/users', '/api/products', '/api/orders', '/api/auth/login', '/api/data']),
                'error_msg': random.choice(['Failed to fetch', 'Network error', 'Server error', 'Validation failed', 'Timeout'])
            }
            
            template_lines = template.format(**params).split('\n')
            for line in template_lines:
                if line:
                    lines.append(line + '\n')
        else:
            lines.append(generate_random_line(i))
    
    return ''.join(lines)

def modify_text(original_text, change_ratio=0.3):
    lines = original_text.split('\n')
    num_changes = int(len(lines) * change_ratio)
    
    new_lines = lines.copy()
    random.seed(99)
    
    for _ in range(num_changes):
        action = random.choice(['modify', 'delete', 'insert'])
        idx = random.randint(0, len(new_lines) - 1)
        
        if action == 'modify':
            if new_lines[idx].strip():
                new_lines[idx] = new_lines[idx].replace('the', 'THE').replace('data', 'MODIFIED_DATA')
        elif action == 'delete' and len(new_lines) > 1:
            del new_lines[idx]
        elif action == 'insert':
            insert_idx = idx
            new_lines.insert(insert_idx, f'// NEW LINE: Added at position {insert_idx} - {random.randint(1, 1000)}')
    
    return '\n'.join(new_lines)

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'ok',
        'service': 'diff-tool-backend',
        'version': '1.0.0'
    })

@app.route('/api/sample-texts', methods=['GET'])
def get_sample_texts():
    size = request.args.get('size', 'large')
    
    size_map = {
        'small': 100,
        'medium': 1000,
        'large': 10000,
        'xlarge': 50000
    }
    
    num_lines = size_map.get(size, 10000)
    
    old_text = generate_code_sample(num_lines, variant=0)
    new_text = modify_text(old_text, change_ratio=0.25)
    
    return jsonify({
        'oldText': old_text,
        'newText': new_text,
        'metadata': {
            'oldLines': old_text.count('\n'),
            'newLines': new_text.count('\n'),
            'size': size,
            'timestamp': __import__('datetime').datetime.now().isoformat()
        }
    })

@app.route('/api/custom-texts', methods=['POST'])
def get_custom_texts():
    data = request.get_json()
    
    old_lines = data.get('oldLines', 10000)
    new_lines = data.get('newLines', 10000)
    change_ratio = data.get('changeRatio', 0.25)
    
    old_text = generate_code_sample(old_lines, variant=0)
    new_text = modify_text(old_text, change_ratio=change_ratio)
    
    return jsonify({
        'oldText': old_text,
        'newText': new_text,
        'metadata': {
            'oldLines': old_text.count('\n'),
            'newLines': new_text.count('\n'),
            'changeRatio': change_ratio,
            'timestamp': __import__('datetime').datetime.now().isoformat()
        }
    })

@app.route('/api/stats', methods=['POST'])
def get_diff_stats():
    data = request.get_json()
    
    old_text = data.get('oldText', '')
    new_text = data.get('newText', '')
    
    old_lines = old_text.split('\n') if old_text else []
    new_lines = new_text.split('\n') if new_text else []
    
    old_non_empty = len([l for l in old_lines if l.strip()])
    new_non_empty = len([l for l in new_lines if l.strip()])
    
    return jsonify({
        'oldText': {
            'totalLines': len(old_lines),
            'nonEmptyLines': old_non_empty,
            'totalChars': len(old_text),
            'avgLineLength': len(old_text) / len(old_lines) if old_lines else 0
        },
        'newText': {
            'totalLines': len(new_lines),
            'nonEmptyLines': new_non_empty,
            'totalChars': len(new_text),
            'avgLineLength': len(new_text) / len(new_lines) if new_lines else 0
        }
    })

if __name__ == '__main__':
    print('\n' + '='*60)
    print('Full-Stack Diff Tool - Backend Server')
    print('='*60)
    print('Starting Flask server on http://localhost:5000')
    print('\nAvailable endpoints:')
    print('  GET  /api/health              - Health check')
    print('  GET  /api/sample-texts        - Get sample diff texts')
    print('  POST /api/custom-texts        - Generate custom test texts')
    print('  POST /api/stats               - Get text statistics')
    print('\nQuery parameters for /api/sample-texts:')
    print('  ?size=small   (100 lines)')
    print('  ?size=medium  (1000 lines)')
    print('  ?size=large   (10000 lines, default)')
    print('  ?size=xlarge  (50000 lines)')
    print('='*60 + '\n')
    
    app.run(host='0.0.0.0', port=5000, debug=False)
