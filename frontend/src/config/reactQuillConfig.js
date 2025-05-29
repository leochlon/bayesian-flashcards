// Quill editor modules configuration
export const modules = {
  toolbar: [
    [{ 'header': [1, 2, false] }],
    ['bold', 'italic', 'underline'],
    ['link'],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }]
  ]
};

// Quill editor formats configuration
export const formats = [
  'header',
  'bold', 'italic', 'underline',
  'list', 'bullet',
  'link',
  'image' // <-- add image support
];