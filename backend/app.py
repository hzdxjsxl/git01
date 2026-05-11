from flask import Flask, jsonify, request
from flask_cors import CORS
import random

app = Flask(__name__)
CORS(app)

BASES = ['A', 'T', 'C', 'G']

def generate_dna_sequence(length: int) -> str:
    return ''.join(random.choice(BASES) for _ in range(length))

def generate_variant_sequence(reference: str, mutation_rate: float = 0.02) -> str:
    sequence = list(reference)
    num_mutations = int(len(sequence) * mutation_rate)
    
    for _ in range(num_mutations):
        index = random.randint(0, len(sequence) - 1)
        current_base = sequence[index]
        available_bases = [b for b in BASES if b != current_base]
        sequence[index] = random.choice(available_bases)
    
    return ''.join(sequence)

@app.route('/api/sequences', methods=['GET'])
def get_sequences():
    try:
        length = int(request.args.get('length', 100000))
        mutation_rate = float(request.args.get('mutation_rate', 0.02))
        
        if length < 1000:
            length = 1000
        if length > 1000000:
            length = 1000000
        
        reference = generate_dna_sequence(length)
        variant = generate_variant_sequence(reference, mutation_rate)
        
        return jsonify({
            'reference': reference,
            'variant': variant,
            'length': length,
            'mutation_rate': mutation_rate
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/sequences/file', methods=['GET'])
def get_sequences_from_file():
    import os
    
    try:
        ref_file = request.args.get('reference')
        var_file = request.args.get('variant')
        
        if not ref_file or not var_file:
            return jsonify({'error': 'Both reference and variant file paths are required'}), 400
        
        if not os.path.exists(ref_file) or not os.path.exists(var_file):
            return jsonify({'error': 'One or both files not found'}), 404
        
        with open(ref_file, 'r') as f:
            reference = f.read().strip().replace('\n', '').replace('\r', '').upper()
        
        with open(var_file, 'r') as f:
            variant = f.read().strip().replace('\n', '').replace('\r', '').upper()
        
        valid_bases = set(BASES)
        reference = ''.join([b for b in reference if b in valid_bases])
        variant = ''.join([b for b in variant if b in valid_bases])
        
        return jsonify({
            'reference': reference,
            'variant': variant,
            'length': len(reference),
            'from_file': True
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'ok', 'message': 'DNA Sequence API is running'})

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
