from langchain_community.document_loaders import CSVLoader

loader = CSVLoader(file_path="text_chunks.txt")  # each row -> one Document
documents = loader.load()

#write document to a text file
with open("courses.txt", "w", encoding="utf-8") as f:
    for doc in documents:
        f.write(doc.page_content + "\n\n")
print(f"Loaded {len(documents)} documents from CSV and written to courses.txt")