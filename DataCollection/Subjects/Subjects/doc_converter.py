import os

folder_path = '.'  # Change if your CSVs are in a subfolder
output_file = 'compiled_output.txt'

compiled_text = ''

for filename in os.listdir(folder_path):
    if filename.endswith('.csv'):
        subject = os.path.splitext(filename)[0]
        with open(os.path.join(folder_path, filename), 'r', encoding='utf-8') as f:
            content = f.read()
        compiled_text += f"Subject: {subject}\n{content}\n\n"

with open(output_file, 'w', encoding='utf-8') as out:
    out.write(compiled_text)

print(f"Compiled text written to {output_file}")