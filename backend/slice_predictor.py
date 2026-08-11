import re
import ast

def main():
    with open("services/predictor.py", "r") as f:
        source = f.read()
    
    tree = ast.parse(source)
    
    functions = {}
    for node in tree.body:
        if isinstance(node, ast.FunctionDef):
            functions[node.name] = (node.lineno, node.end_lineno)
        elif isinstance(node, ast.ClassDef):
            functions[node.name] = (node.lineno, node.end_lineno)

    print("Top-level definitions found:")
    for name, (start, end) in functions.items():
        print(f"  {name}: lines {start}-{end}")

if __name__ == "__main__":
    main()
