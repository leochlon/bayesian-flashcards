use std::env;
use std::fs;
use std::path::Path;

fn main() {
    // Copy the latest init_db.py file during build
    let _out_dir = env::var("OUT_DIR").unwrap();
    let manifest_dir = env::var("CARGO_MANIFEST_DIR").unwrap();
    
    let src_init_db = Path::new(&manifest_dir).join("../backend/init_db.py");
    let dest_init_db = Path::new(&manifest_dir).join("python-dist/backend/init_db.py");
    
    if src_init_db.exists() {
        if let Err(e) = fs::copy(&src_init_db, &dest_init_db) {
            println!("cargo:warning=Failed to copy init_db.py: {}", e);
        } else {
            println!("cargo:warning=Successfully copied init_db.py");
        }
    }
    
    tauri_build::build()
}
