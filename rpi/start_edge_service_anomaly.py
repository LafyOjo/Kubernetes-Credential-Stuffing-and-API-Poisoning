import os
from start_edge_service import main

if __name__ == "__main__":
    os.environ["ANOMALY_DETECTION"] = "true"
    main()
